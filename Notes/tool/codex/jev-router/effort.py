"""Joint execution choices and effort policy. No network or persistent writes."""
import copy
import time

from policy import choose, task_tier


EFFORTS = {
    'low': 'Light reasoning for clear, bounded tasks with straightforward verification.',
    'medium': 'Ordinary multi-step reasoning for routine engineering and analysis.',
    'high': 'Deeper reasoning for difficult dependencies, ambiguity or consequential decisions.',
    'xhigh': 'Extra reasoning for exceptionally difficult analysis requiring extensive checking.',
}
POLICY_HEADER = 'x-jev-effort-policy'


def validate_config(config):
    if config.get('effort_policy', 'fixed') not in ('fixed', 'auto'):
        raise ValueError('effort_policy must be fixed or auto')
    levels = config.get('auto_efforts', list(EFFORTS))
    if (not isinstance(levels, list) or not levels
            or any(not isinstance(x, str) or x not in EFFORTS for x in levels)
            or len(set(levels)) != len(levels)):
        raise ValueError('auto_efforts must contain unique supported automatic levels')
    fallbacks = config.get('fallback_efforts', {})
    for tier in ('simple', 'standard', 'demanding'):
        effort = fallbacks.get(tier)
        if effort not in levels:
            raise ValueError('Each fallback effort must belong to auto_efforts')
        if effort not in config['models'][config['fallback_models'][tier]]['efforts']:
            raise ValueError('Fallback model and effort must be compatible')


def resolve_policy(config, headers):
    normalized = {k.lower(): v for k, v in headers.items()}
    mode = normalized.get(POLICY_HEADER, config.get('effort_policy', 'fixed'))
    if mode not in ('auto', 'fixed'):
        raise ValueError('X-Jev-Effort-Policy must be auto or fixed')
    return mode, 'request_header' if POLICY_HEADER in normalized else 'gateway_default'


def execution_options(config, eligible_models):
    options = {}
    for model in eligible_models:
        spec = config['models'][model]
        if spec.get('enabled') is False:
            continue
        for effort in config['auto_efforts']:
            if effort in spec['efforts']:
                options[model + '|' + effort] = {'model': model, 'effort': effort}
    if not options or len(options) > 254:
        raise ValueError('Joint routing requires 1 to 254 legal execution combinations')
    return options


def choose_execution(config, previous, turn, event, judgment, body, mode, now=None):
    """Apply existing model guards before committing an indivisible auto pair."""
    now = time.time() if now is None else now
    incoming = body.get('reasoning', {}).get('effort')
    if mode == 'fixed':
        result = choose(config, previous, turn, event, judgment, body, now)
        result.update(reasoning_effort=incoming, effort_source='request_passthrough')
        return result

    selection_body = copy.deepcopy(body)
    selection_body.get('reasoning', {}).pop('effort', None)
    config = copy.deepcopy(config)
    for spec in config['models'].values():
        if not set(spec['efforts']).intersection(config['auto_efforts']):
            spec['enabled'] = False
    tier, _ = task_tier(config, judgment)
    proposed = judgment.get('reasoning_effort') if judgment else None
    # A high-risk/demanding signal cannot select a low-effort pair.
    if judgment and tier == 'demanding' and proposed in ('low', 'medium'):
        judgment = dict(judgment, confidence=0)
    prior = copy.deepcopy(previous)
    if prior:
        # Model-only forecasts cannot price a different reasoning budget.
        prior.pop('cost_evidence', None)
        prior['switched_at'] = max(prior.get('switched_at', 0),
                                   prior.get('effort_switched_at', 0))
    result = choose(config, prior, turn, event, judgment, selection_body, now)
    model = result['model']
    old_effort = previous.get('reasoning_effort') if previous else None
    allowed = config['models'][model]['efforts']
    if previous and model == previous['model'] and result['reason'] != 'confirmed_current':
        keep = old_effort or incoming
        if keep is not None and keep not in allowed:
            raise ValueError('Bound effort is incompatible; use a compatible fixed effort or a new chat')
        result.update(reasoning_effort=keep, effort_changed=False,
                      effort_source=('keep_' + result['reason']) if keep is not None
                      else 'legacy_unspecified_keep')
        return result
    automatic = [x for x in config['auto_efforts'] if x in allowed]
    fallback = config['fallback_efforts'][tier]
    if result.get('selection_source') == 'model_judgment':
        candidate, source = proposed, 'joint_judgment'
    else:
        candidate, source = fallback, 'profile_' + tier
    if candidate not in automatic:
        # Do not silently lower a required fallback budget.
        candidates = [x for x in automatic if list(EFFORTS).index(x) >= list(EFFORTS).index(fallback)]
        if not candidates:
            raise ValueError('No compatible automatic effort meets the fallback requirement')
        candidate, source = candidates[0], 'compatible_effort_fallback'

    if previous and model == previous['model']:
        keep = old_effort or incoming
        reason = None
        if now - max(previous.get('switched_at', 0),
                     previous.get('effort_switched_at', 0)) < config['minimum_hold_seconds']:
            reason = 'minimum_hold'
        elif keep in EFFORTS and candidate != keep and event != 'new_task':
            if list(EFFORTS).index(candidate) < list(EFFORTS).index(keep):
                reason = 'no_mid_task_effort_downgrade'
            elif judgment and judgment['capability_gap'] < config['gap_threshold']:
                reason = 'insufficient_effort_upgrade_evidence'
        elif keep is not None and keep not in EFFORTS and candidate != keep and event != 'new_task':
            reason = 'manual_effort_keep'
        if reason:
            candidate, source = keep, 'keep_' + reason
    if candidate is not None and candidate not in allowed:
        raise ValueError('Bound effort is incompatible; use a compatible fixed effort or a new chat')
    result.update(reasoning_effort=candidate, effort_source=source,
                  effort_changed=bool(previous and candidate != old_effort))
    return result
