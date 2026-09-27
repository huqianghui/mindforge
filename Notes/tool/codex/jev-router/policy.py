"""Task-sticky routing. No IO; confidence is classification certainty, not success."""
import hashlib
import json
import math
import re
import time


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def identity(headers):
    headers = {k.lower(): v for k, v in headers.items()}
    try:
        meta = json.loads(headers.get('x-codex-turn-metadata', '{}'))
    except (ValueError, TypeError):
        meta = {}
    if not isinstance(meta, dict):
        meta = {}
    thread = meta.get('thread_id') or headers.get('thread-id')
    turn = meta.get('turn_id')
    # No guessing from prompt_cache_key (can be shared by unrelated chats).
    if not isinstance(thread, str) or not thread or not isinstance(turn, str) or not turn:
        raise ValueError('auto-jev requires Codex thread_id and turn_id metadata')
    agent = meta.get('agent_name', '/root')
    return digest(thread + ':' + str(agent)), turn, meta.get('context_window_id')


def context(body, limit=12000):
    messages = []
    items = body.get('input', [])
    if isinstance(items, str):
        items = [{'role': 'user', 'content': items}]
    for item in items:
        if not isinstance(item, dict) or item.get('role') not in ('user', 'assistant'):
            continue
        content = item.get('content', [])
        if isinstance(content, str):
            text = content
        else:
            text = '\n'.join(x.get('text', '') for x in content
                             if isinstance(x, dict) and isinstance(x.get('text'), str))
        if text.strip():
            messages.append({'role': item['role'], 'text': text[-6000:]})
    latest = next((m['text'] for m in reversed(messages) if m['role'] == 'user'), '')
    selected, used = [], 0
    for m in reversed(messages):
        if used >= limit:
            break
        text = m['text'][-(limit-used):]
        selected.append({'role': m['role'], 'text': text})
        used += len(text)
    return latest, list(reversed(selected))


def event_for(latest):
    # Only an explicit prefix in the latest user message. Quoted tool output cannot
    # generate policy events. No broad "error" regex or per-turn Jev classification.
    if re.match(r'^\s*(?:新任务[：:]|切换到新任务[：:]|\[new-task\])', latest, re.I):
        return 'new_task'
    if re.match(r'^\s*(?:重新评估模型|升级模型|\[reassess\])(?:\s|[：:，,。.!！]|$)', latest, re.I):
        return 'reassess'
    return 'continue'


def opaque_state(body):
    if body.get('previous_response_id') or body.get('conversation'):
        return True
    def walk(v):
        if isinstance(v, dict):
            if v.get('encrypted_content') or v.get('type') in ('compaction', 'compaction_summary'):
                return True
            return any(walk(x) for x in v.values())
        return isinstance(v, list) and any(walk(x) for x in v)
    return walk(body.get('input', []))


def valid_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0


def estimate_cost(model, evidence, horizon):
    """Scenario estimate, never a claim about current physical cache availability.

    A candidate defaults to a cold prefix. Even if it was used earlier we do not
    assume its prior entry still exists. Price units are USD / million tokens.
    """
    prices = model.get('prices')
    required = ('input', 'cached_input', 'cache_write', 'output')
    if not prices or any(not valid_number(prices.get(k)) for k in required):
        return None
    keys = ('prefix_tokens', 'new_tokens_per_request', 'output_tokens_per_request', 'cached_prefix_tokens')
    if any(not valid_number(evidence.get(k)) for k in keys):
        return None
    prefix, cached = evidence['prefix_tokens'], evidence['cached_prefix_tokens']
    if cached > prefix or horizon < 1:
        return None
    first = cached * prices['cached_input'] + (prefix-cached) * prices['cache_write']
    subsequent = (horizon-1) * prefix * prices['cached_input']
    dynamic = horizon * (evidence['new_tokens_per_request'] * prices['input']
                         + evidence['output_tokens_per_request'] * prices['output'])
    return (first + subsequent + dynamic) / 1_000_000


def task_tier(config, judgment):
    confident_profile = (judgment is not None and
                         judgment.get('workload_confidence', 0) >= config['profile_confidence_threshold'])
    workload = judgment.get('workload') if confident_profile else 'unknown'
    risk = judgment.get('high_risk', 0.5) if judgment else 0.5
    tier = 'demanding' if workload == 'demanding' or risk >= config['risk_threshold'] else 'standard'
    if workload == 'simple' and risk <= config['low_risk_threshold']:
        tier = 'simple'
    return tier, workload


def select_candidate(config, judgment, body):
    """Separate model-choice uncertainty from task demand; never infer price."""
    models = config['models']
    effort = body.get('reasoning', {}).get('effort')
    eligible = {k for k, v in models.items() if v.get('enabled') is not False
                and (not effort or effort in v['efforts'])}
    tier, workload = task_tier(config, judgment)
    candidate = judgment.get('model') if judgment else None
    confident_model = (candidate in eligible and
                       judgment['confidence'] >= config['confidence_threshold'])
    # A strong independent risk/demand signal overrides an undersized choice.
    demanding = config['fallback_models']['demanding']
    if confident_model and (tier != 'demanding' or models[candidate]['rank'] >= models[demanding]['rank']):
        return candidate, 'model_judgment', False
    target = config['fallback_models'][tier]
    provisional = tier == 'standard' and workload == 'unknown'
    if target in eligible:
        source = 'judge_unavailable' if judgment is None else 'profile_' + tier
        return target, source, provisional
    # Never route to a disabled deployment or silently change reasoning effort.
    minimum_rank = models[target]['rank']
    alternatives = sorted((k for k in eligible if models[k]['rank'] >= minimum_rank),
                          key=lambda k: (models[k]['rank'], k))
    if not alternatives:
        raise ValueError('No eligible model satisfies the fallback requirement')
    return alternatives[0], 'compatible_fallback_' + tier, provisional


def choose(config, previous, turn, event, judgment, body, now=None):
    now = time.time() if now is None else now
    models = config['models']
    current = previous.get('model') if previous else None
    default = config['default_model']
    result = {'model': current or default, 'reason': 'sticky', 'switch': False,
              'event': event, 'cost_estimate': None}
    if previous and previous.get('turn_id') == turn:
        result['reason'] = 'same_turn'
        return result
    if event == 'continue' and current:
        return result
    if judgment is None and current:
        result['reason'] = 'judge_unavailable_keep'
        return result
    candidate, source, provisional = select_candidate(config, judgment, body)
    result.update(selection_source=source)
    if current and provisional:
        result['reason'] = 'uncertain_keep'
        return result
    if candidate == current:
        result['reason'] = 'confirmed_current'
        result['provisional'] = provisional
        return result
    if opaque_state(body):
        result['reason'] = 'opaque_state_keep' if current else 'opaque_state_default'
        return result
    if current:
        if now-previous.get('switched_at', 0) < config['minimum_hold_seconds']:
            result['reason'] = 'minimum_hold'
            return result
        # Requirements can override cost, but a downgrade within the same task
        # needs explicit new-task evidence AND a conservative cost advantage.
        if models[candidate]['rank'] <= models[current]['rank']:
            # Correct only an explicitly reassessed provisional fallback, never
            # a manual binding or an established model chosen with evidence.
            if previous.get('provisional') and event in ('new_task', 'reassess'):
                result.update(model=candidate, switch=True, provisional=False,
                              reason='fallback_correction')
                return result
            if event != 'new_task':
                result['reason'] = 'no_mid_task_downgrade'
                return result
            evidence = previous.get('cost_evidence', {})
            if now-evidence.get('observed_at', 0) > config['cost_evidence_max_age_seconds']:
                result['reason'] = 'cost_evidence_stale_or_missing'
                return result
            stay = estimate_cost(models[current], evidence, config['cost_horizon_requests'])
            cold = dict(evidence, cached_prefix_tokens=0)
            switch = estimate_cost(models[candidate], cold, config['cost_horizon_requests'])
            if stay is None or switch is None:
                result['reason'] = 'prices_or_forecast_unknown'
                return result
            overhead = config['switch_overhead_usd']
            result['cost_estimate'] = {'stay_usd': stay, 'switch_usd': switch + overhead,
                                       'kind': 'scenario_not_measured_savings'}
            if stay-(switch+overhead) < max(config['minimum_savings_usd'], stay*config['minimum_savings_fraction']):
                result['reason'] = 'cache_advantage_keep'
                return result
        elif event == 'reassess' and judgment['capability_gap'] < config['gap_threshold']:
            result['reason'] = 'insufficient_upgrade_evidence'
            return result
    result.update(model=candidate, switch=bool(current), provisional=provisional,
                  reason=('initial_' + source) if not current else 'task_switch')
    return result
