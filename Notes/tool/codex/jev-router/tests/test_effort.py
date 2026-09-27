import copy
import json
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from effort import choose_execution, execution_options, resolve_policy, validate_config
from gateway import Router, Store
from jev import Jev, WORKLOADS
from test_router import CONFIG, HIGH, LIGHT, BALANCED, headers, body


def choice(selected, options):
    return {'type': 'choice', 'choice': selected, 'confidence': .95,
            'probabilities': {k: float(k == selected) for k in options}}


def auto_headers(turn='t1', thread='joint'):
    return {**headers(turn, thread), 'X-Jev-Effort-Policy': 'auto'}


class JointJudge:
    def __init__(self, model=LIGHT, effort='low', workload='simple'):
        self.model, self.effort, self.workload = model, effort, workload
        self.calls, self.fail, self.confidence, self.risk, self.gap = 0, False, .95, .01, .95

    def evaluate(self, state):
        self.calls += 1
        self.last_state = state
        if self.fail:
            raise TimeoutError('do not log request text or secrets')
        return dict(model=self.model, reasoning_effort=self.effort,
                    confidence=self.confidence, workload=self.workload,
                    workload_confidence=.95, high_risk=self.risk, capability_gap=self.gap)


class JointTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.cfg = copy.deepcopy(CONFIG)
        self.cfg.update(minimum_hold_seconds=0, evaluation_cooldown_seconds=0)
        self.store = Store(temp.name)
        self.judge = JointJudge()
        self.router = Router(self.cfg, self.store, self.judge)

    def route(self, text='hello', turn='t1', **fields):
        return self.router.prepare(body(text, **fields), auto_headers(turn))

    def test_joint_overrides_declared_default_only_in_auto_mode(self):
        self.judge.effort = 'medium'
        request = body(reasoning={'effort': 'low', 'summary': 'detailed'}, prompt_cache_key='keep')
        original = copy.deepcopy(request)
        key, forwarded, decision = self.router.prepare(request, auto_headers())
        self.assertEqual(forwarded, dict(original, model=LIGHT,
                         reasoning={'effort': 'medium', 'summary': 'detailed'}))
        self.assertEqual(request, original)
        self.assertEqual(decision['effort_source'], 'joint_judgment')
        self.assertEqual(decision['requested_effort'], 'low')
        self.assertEqual(self.store.get(key)['reasoning_effort'], 'medium')
        self.assertEqual(self.judge.last_state['effort_policy'], 'auto')
        self.assertEqual(self.judge.last_state['requested_effort'], 'low')

    def test_fixed_header_wins_over_gateway_auto_and_preserves_effort(self):
        self.cfg['effort_policy'] = 'auto'
        for effort in ('low', 'xhigh', 'max'):
            _, forwarded, decision = self.router.prepare(body(reasoning={'effort': effort}),
                {**headers(thread=effort), 'x-jev-effort-policy': 'fixed'})
            self.assertEqual(forwarded['reasoning']['effort'], effort)
            self.assertEqual(decision['effort_policy_source'], 'request_header')
        with self.assertRaises(ValueError):
            resolve_policy(self.cfg, {'X-Jev-Effort-Policy': 'automatic'})

    def test_auto_global_default_and_fixed_omission(self):
        self.cfg['effort_policy'] = 'auto'
        _, forwarded, _ = self.router.prepare(body(), headers())
        self.assertEqual(forwarded['reasoning']['effort'], 'low')
        _, forwarded, _ = self.router.prepare(body(), {**headers(thread='fixed'),
            'X-Jev-Effort-Policy': 'fixed'})
        self.assertNotIn('reasoning', forwarded)

    def test_pair_survives_tools_turns_restart_and_compaction(self):
        self.judge.effort = 'high'
        key, _, _ = self.route()
        self.judge.model, self.judge.effort = HIGH, 'xhigh'
        for turn in ('t1', 't2'):
            _, forwarded, _ = self.route(turn=turn, reasoning={'effort': 'low'})
            self.assertEqual((forwarded['model'], forwarded['reasoning']['effort']), (LIGHT, 'high'))
        restarted = Router(self.cfg, Store(self.store.folder), JointJudge(HIGH, 'xhigh'))
        _, forwarded, _ = restarted.prepare(body(), auto_headers('t3'), compact=True)
        self.assertEqual(forwarded['reasoning']['effort'], 'high')
        self.assertEqual(restarted.judge.calls, 0)
        self.assertEqual(self.judge.calls, 1)
        self.assertEqual(self.store.get(key)['reasoning_effort'], 'high')

    def test_profile_fallback_pairs_and_risk_override(self):
        for workload, risk, model, effort in (
                ('simple', .01, LIGHT, 'low'), ('standard', .01, BALANCED, 'medium'),
                ('demanding', .01, HIGH, 'high'), ('unknown', .5, BALANCED, 'medium'),
                ('simple', .95, HIGH, 'high')):
            with self.subTest(workload=workload, risk=risk):
                self.judge.workload, self.judge.risk = workload, risk
                self.judge.model, self.judge.confidence = 'uncertain', .3
                _, f, _ = self.router.prepare(body(), auto_headers(thread=workload+str(risk)))
                self.assertEqual((f['model'], f['reasoning']['effort']), (model, effort))

    def test_high_risk_cannot_choose_high_model_with_low_effort(self):
        self.judge.model, self.judge.effort, self.judge.risk = HIGH, 'low', .95
        _, forwarded, decision = self.route()
        self.assertEqual(forwarded['reasoning']['effort'], 'high')
        self.assertEqual(decision['effort_source'], 'profile_demanding')

    def test_failure_and_invalid_pair_fallback_without_retry(self):
        for invalid in ('timeout', 'ultra', 'missing'):
            with self.subTest(invalid=invalid):
                self.judge.fail = invalid == 'timeout'
                self.judge.effort = None if invalid == 'missing' else invalid
                count = self.judge.calls
                for turn in ('t1', 't1', 't2'):
                    _, f, d = self.router.prepare(body(), auto_headers(turn, invalid))
                    self.assertEqual((f['model'], f['reasoning']['effort']), (BALANCED, 'medium'))
                self.assertEqual(self.judge.calls - count, 1)
                self.assertTrue(d['provisional'])
        self.assertNotIn('secrets', (self.store.folder/'events.jsonl').read_text())

    def test_reassessment_failure_retains_pair(self):
        self.judge.effort = 'high'
        self.route()
        self.judge.fail = True
        _, forwarded, decision = self.route('[reassess] deeper', 't2')
        self.assertEqual((forwarded['model'], forwarded['reasoning']['effort']), (LIGHT, 'high'))
        self.assertEqual(decision['reason'], 'judge_unavailable_keep')

    def test_effort_upgrade_same_model_and_hold(self):
        self.route()
        self.judge.effort = 'high'
        _, f, d = self.route('[reassess] deeper', 't2')
        self.assertEqual(f['reasoning']['effort'], 'high')
        self.assertTrue(d['effort_changed'])
        self.cfg['minimum_hold_seconds'] = 300
        self.judge.effort = 'xhigh'
        _, f, d = self.route('[reassess] more', 't3')
        self.assertEqual(f['reasoning']['effort'], 'high')
        self.assertEqual(d['effort_source'], 'keep_minimum_hold')

    def test_effort_upgrade_needs_gap_downgrade_needs_new_task(self):
        self.judge.effort = 'medium'
        self.route()
        self.judge.effort, self.judge.gap = 'high', .1
        self.assertEqual(self.route('[reassess] inspect', 't2')[1]['reasoning']['effort'], 'medium')
        self.judge.effort = 'low'
        self.assertEqual(self.route('[reassess] inspect', 't3')[1]['reasoning']['effort'], 'medium')
        self.assertEqual(self.route('[new-task] greeting', 't4')[1]['reasoning']['effort'], 'low')

    def test_model_guard_does_not_mix_rejected_pair_effort(self):
        self.cfg['minimum_hold_seconds'] = 300
        self.route()
        self.judge.model, self.judge.effort = HIGH, 'xhigh'
        _, f, d = self.route('[reassess] harder', 't2')
        self.assertEqual((f['model'], f['reasoning']['effort']), (LIGHT, 'low'))
        self.assertEqual(d['reason'], 'minimum_hold')

    def test_retained_pair_does_not_need_standard_fallback_effort(self):
        self.cfg['models'][LIGHT]['efforts'] = ['low']
        validate_config(self.cfg)
        previous = {'model': LIGHT, 'reasoning_effort': 'low', 'turn_id': 'old'}
        for turn, event in (('old', 'continue'), ('new', 'continue'), ('new', 'reassess')):
            with self.subTest(turn=turn, event=event):
                d = choose_execution(self.cfg, previous, turn, event, None, body(), 'auto')
                self.assertEqual((d['model'], d['reasoning_effort']), (LIGHT, 'low'))
        previous.pop('reasoning_effort')
        d = choose_execution(self.cfg, previous, 'old', 'continue', None, body(), 'auto')
        self.assertIsNone(d['reasoning_effort'])

    def test_effort_change_resets_hold_for_cross_model_change(self):
        self.cfg['minimum_hold_seconds'] = 300
        previous = {'model': LIGHT, 'reasoning_effort': 'low', 'turn_id': 'old',
                    'switched_at': 0, 'effort_switched_at': 0}
        judge = JointJudge(LIGHT, 'high')
        d = choose_execution(self.cfg, previous, 't2', 'reassess',
                             judge.evaluate({}), body(), 'auto', now=800)
        self.assertEqual(d['reasoning_effort'], 'high')
        previous.update(reasoning_effort='high', effort_switched_at=800, turn_id='t2')
        judge.model = HIGH
        for now, expected in ((1000, LIGHT), (1101, HIGH)):
            d = choose_execution(self.cfg, previous, 't3', 'reassess',
                                 judge.evaluate({}), body(), 'auto', now=now)
            self.assertEqual(d['model'], expected)

    def test_opaque_history_retains_effort_even_at_task_boundary(self):
        self.route()
        self.judge.effort = 'high'
        _, f, _ = self.route(turn='t2', input=[
            {'type': 'reasoning', 'encrypted_content': 'opaque'},
            {'role': 'user', 'content': '[new-task] harder'}])
        self.assertEqual(f['reasoning']['effort'], 'low')
        self.assertEqual(self.judge.calls, 1)

    def test_old_bindings_do_not_invent_or_reselect_effort(self):
        key, _, _ = self.route()
        state = self.store.get(key)
        state.pop('reasoning_effort')
        self.store.put(key, state)
        _, forwarded, d = self.route(turn='t2')
        self.assertNotIn('reasoning', forwarded)
        self.assertEqual(d['effort_source'], 'legacy_unspecified_keep')
        self.assertEqual(self.route(turn='t3', reasoning={'effort': 'xhigh'})[1]['reasoning']['effort'], 'xhigh')
        self.assertEqual(self.judge.calls, 1)

    def test_manual_model_and_effort_override_are_preserved(self):
        self.route()
        request = body(model=HIGH, reasoning={'effort': 'max'})
        _, f, _ = self.router.prepare(request, auto_headers('t2'))
        self.assertEqual(f, request)
        _, f, _ = self.route(turn='t3', reasoning={'effort': 'low'})
        self.assertEqual((f['model'], f['reasoning']['effort']), (HIGH, 'max'))
        self.assertEqual(self.judge.calls, 1)

    def test_fixed_override_replaces_automatic_binding(self):
        self.judge.effort = 'high'
        self.route()
        self.router.prepare(body(reasoning={'effort': 'medium'}),
                            {**auto_headers('t2'), 'X-Jev-Effort-Policy': 'fixed'})
        self.assertEqual(self.route(turn='t3')[1]['reasoning']['effort'], 'medium')

    def test_auto_does_not_reuse_model_only_cost_forecast(self):
        self.judge.model, self.judge.effort = HIGH, 'high'
        key, _, _ = self.route()
        state = self.store.get(key)
        state['cost_evidence'] = {'observed_at': 99999999999, 'prefix_tokens': 100000,
            'cached_prefix_tokens': 0, 'new_tokens_per_request': 1000, 'output_tokens_per_request': 1000}
        self.store.put(key, state)
        self.judge.model, self.judge.effort = LIGHT, 'low'
        _, f, d = self.route('[new-task] greeting', 't2')
        self.assertEqual((f['model'], f['reasoning']['effort']), (HIGH, 'high'))
        self.assertIsNone(d['cost_estimate'])

    def test_joint_options_and_typed_response_contract(self):
        options = execution_options(self.cfg, list(self.cfg['models']))
        self.assertEqual(len(options), 28)
        jev = Jev(self.cfg, 'unused')
        payload = jev.request({'effort_policy': 'auto', 'eligible_models': [LIGHT, HIGH]})
        self.assertNotIn('model', payload['questions'])
        self.assertEqual(len(payload['questions']['execution']['criteria']), 9)
        selected = LIGHT+'|high'
        data = {'answers': {
            'execution': choice(selected, set(options) | {'uncertain'}),
            'workload': choice('standard', WORKLOADS),
            'capability_gap': {'type': 'noul', 'noul': .95},
            'high_risk': {'type': 'noul', 'noul': .01}}}
        result = jev.validate(data, set(options) | {'uncertain'}, options)
        self.assertEqual((result['model'], result['reasoning_effort']), (LIGHT, 'high'))
        self.assertEqual(result['joint_confidence'], .95)
        self.assertIn(selected, result['execution_probabilities'])
        data['answers']['execution']['choice'] = LIGHT+'|ultra'
        with self.assertRaises(ValueError):
            jev.validate(data, set(options) | {'uncertain'}, options)

    def test_evaluate_constructs_one_joint_request_and_decodes_response(self):
        options = execution_options(self.cfg, [LIGHT])
        data = {'answers': {
            'execution': choice(LIGHT+'|medium', set(options) | {'uncertain'}),
            'workload': choice('standard', WORKLOADS),
            'capability_gap': {'type': 'noul', 'noul': .95},
            'high_risk': {'type': 'noul', 'noul': .01}},
            'usage': {'input_tokens': 10, 'output_tokens': 20}, 'model': 'fixture'}
        with patch('jev.opener') as opened:
            opened.return_value.open.return_value = io.BytesIO(json.dumps(data).encode())
            result = Jev(self.cfg, 'fixture').evaluate(
                {'effort_policy': 'auto', 'eligible_models': [LIGHT]})
            self.assertEqual(opened.return_value.open.call_count, 1)
            request = opened.return_value.open.call_args.args[0]
            payload = json.loads(request.data)
            self.assertIn('execution', payload['questions'])
            self.assertNotIn('model', payload['questions'])
            self.assertEqual(result['reasoning_effort'], 'medium')
            self.assertEqual(result['usage'], data['usage'])

    def test_invalid_config_and_request_rejected(self):
        validate_config(self.cfg)
        for change in ({'effort_policy': 'guess'}, {'auto_efforts': ['ultra']},
                       {'auto_efforts': ['low', 'low']}, {'fallback_efforts': {}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_config(dict(self.cfg, **change))
        for reasoning in (None, 'low', {'effort': 3}):
            with self.assertRaises(ValueError):
                self.route(reasoning=reasoning)
        self.assertEqual(self.judge.calls, 0)


if __name__ == '__main__':
    unittest.main()
