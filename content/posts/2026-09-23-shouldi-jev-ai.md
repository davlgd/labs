---
author: davlgd
pubDatetime: 2026-09-23T13:37:00Z
title: "shouldi: exploring Jev AI by example"
description: "Scores, not sentences"
tags:
  - AI
  - Web
  - Tools
ogImage: /images/2026-09-shouldi-jev-ai.webp
---

A week ago, a model that can't write a single sentence reached the top of Hacker News. Jev, from TypeSafe, answers questions with numbers, not words. After a few days of early access behind a waitlist, anyone can now [sign up](https://console.typesafe.ai/) and get an API key to try it.

The docs describe it well, but a model this different is something you have to try. So I built demos to understand Jev's API, and find its limits in practice. That led me to [shouldi](https://github.com/davlgd/shouldi), a good example to explain Jev principles in a simple and practicle way: what it can do, what it leaves to classic LLMs, and what they can achieve together.

- [A demo video of Shoudi](https://bsky.app/profile/davlgd.fr/post/3mwdb4mlzlk25)

## Seven days of Jev

It all started on September 15. TypeSafe [came out of stealth](https://www.financialcontent.com/article/bizwire-2026-9-15-typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai) that day, with $40M from DCVC and a [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev) signed by its CEO, Diogo Almeida, who [co-invented RLHF and InstructGPT](https://typesafe.ai/team) according to the company. The numbers were bold: 70 to 500 ms per answer, $0.042 per million input tokens, and output tokens "FREE (too cheap to meter)".

That's the kind of promise Hacker News loves to take apart, and [the thread](https://news.ycombinator.com/item?id=49717558) climbed to 1,970 points and 512 comments. The [most discussed comment](https://news.ycombinator.com/item?id=49718492) summed up the doubt: a model that can't emit an invalid type "can still emit a completely wrong valid value". Choosing not to publish results on public benchmarks didn't help TypeSafe's case.

It didn't slow anything down either. By the next day, third-party AI gateways were already distributing Jev, TechCrunch saw it [thrilling developers](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/) by the end of the week, and the waitlist [was gone](https://news.ycombinator.com/item?id=49780343) on September 20. When Simon Willison wrote about [a new shape of LLM](https://simonwillison.net/2026/Sep/21/jev/) the day after, people were already building with it. And they built fast. 

The browser-use team made [jev-ultrafast](https://github.com/browser-use/jev-ultrafast), an agent searching Google Flights in a recorded 7.1-second run, with Jev picking the actions. Others plugged it into their coding agents: [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) replaces Claude Code's compaction summary with keep or drop decisions, while [pi-warden](https://github.com/DevMortimer/pi-warden) enforces project rules as the agent writes.

Within a few days, there was an [awesome-jev](https://github.com/Amal-David/awesome-jev) list and open "Jev-like" models such as [kev](https://github.com/jaredpalmer/kev). The fatigue came as fast as the hype: by September 21, one HN reader was ["already burnt out on all this jev talk"](https://news.ycombinator.com/item?id=49788533). So it's the good timing to add a blog post. Isn't it?

## A model that doesn't talk

"System One" comes from Daniel Kahneman's [Thinking, Fast and Slow](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow): System 1 is the fast, intuitive way we think, System 2 the slow and deliberate one. In TypeSafe's analogy, LLMs with long reasoning traces sit on the second side. Jev is built for the first: quick judgement calls, the kind of `if` you can't write with a regex.

Jev itself is named after William Stanley Jevons, the economist behind the [Jevons paradox](https://en.wikipedia.org/wiki/Jevons_paradox): make a resource cheaper to use, and we end up using more of it. That's the bet.

In practice, you send a `state` (text or JSON) and typed questions. There are three kinds: a `noul` (short for Bernoulli, a yes/no probability), a `choice` among up to 255 options, and a `score` on an ordered scale of up to 10 levels.

Here's a message I wouldn't like to receive, with three questions about it, in `ask.json`:

```json
{
  "model": "jev-latest",
  "state": {
    "message": "As I already said in my previous message, the deploy is blocked until someone actually reads the runbook."
  },
  "questions": {
    "passive_aggressive": {
      "type": "score",
      "instructions": "How passive-aggressive is `message`?",
      "criteria": ["Not at all", "Slightly", "Clearly", "Extremely"]
    },
    "flame_war": {
      "type": "noul",
      "instructions": "Is `message` likely to start a heated argument among its readers?"
    },
    "reaction": {
      "type": "choice",
      "instructions": "Which emoji reaction is `message` most likely to get?",
      "criteria": { "thumbsup": null, "eyes": null, "eyeroll": null, "heart": null }
    }
  }
}
```

With a key from the [TypeSafe console](https://console.typesafe.ai/keys), `curl` and `jq`, it's one request:

```bash
$ export JEV_API_KEY="your-key"

$ curl -s https://api.typesafe.ai/v1/systemone \
    -H "Authorization: Bearer $JEV_API_KEY" \
    -H "Content-Type: application/json" \
    -d @ask.json \
  | jq -c '.model, (.answers | to_entries[] | {(.key): (.value | del(.type, .legend))}), .usage'
"jev-1.13.0"
{"passive_aggressive":{"score":2.08,"confidence":0.87,"probabilities":{"0":0.0,"1":0.03,"2":0.87,"3":0.1}}}
{"flame_war":{"noul":0.64}}
{"reaction":{"choice":"eyeroll","confidence":0.92,"probabilities":{"eyeroll":0.95,"thumbsup":0.0,"heart":0.0,"eyes":0.05}}}
{"input_tokens":410,"output_tokens":85}
```

"Clearly" passive-aggressive, a 0.64 chance of starting an argument, and a 0.95 probability of an eye roll. These are the model's estimates: I haven't measured how well they're calibrated on workplace messages. Note the two numbers on the reaction. 0.95 is the probability given to the eye roll, while the 0.92 [confidence](https://docs.typesafe.ai/confidence) measures how concentrated the whole distribution is.

Jev picks among labels I supplied, it never writes a reply. On HN, the CEO [explained](https://news.ycombinator.com/item?id=49719122) that strings "are not allowed at all", so every answer can be computed in parallel. That's also how TypeSafe justifies free output tokens. The round trip took between 0.4 and 0.7 s from my Mac, and 410 input tokens cost around $0.000017. I asked for `jev-latest` and got an answer from `jev-1.13.0`: once your thresholds are tuned, pin the version.

## Between two worlds

This tiny example shows what changes the game. On one side, the old world: decision trees built on strict criteria, like word lists or regexes. They can tell "as I already said" from a friendly reminder, but only with a tree of cases that never stops growing.

On the other side, LLMs get it from a single prompt, but answer with prose you have to parse, take seconds, and cost more per call. You can add tools, contrainsts in response format, but at the end, it's not what they're designed for. Jev sits between the two. 

It can't phrase this message better, and never will. But ask it an open question in plain English, and it gives a number back in a fraction of a second, for a fraction of a cent. The decision tree stays in my code, and each branch can now rest on a judgement.

That opens doors that didn't exist. A judgement cheap enough to run on every message, every log line, every tool call an agent wants to make: is this error worth waking someone up at night? Does this command match what the user asked for?

## What Jev brings to the table

The interesting part isn't speed, it's the probabilities. Jev is trained with what TypeSafe calls Reinforcement Learning for Calibrated Decisions (RLCD). The goal: when it says 0.8, it should be right about 80% of the time. The [docs](https://docs.typesafe.ai/concepts/system-one) stay careful: calibration "is measured across groups of predictions; it does not guarantee that an individual answer is correct."

So I don't get an answer to trust. I get values I can use to accept a result, ask for a review, or hand the case to another model. The docs suggest it: act when confidence is high, escalate "to a person or a reasoning model" when it's low, with thresholds that follow the risk. 

When a decision needs words, it goes elsewhere: TypeSafe itself says Jev is [not a drop-in replacement](https://docs.typesafe.ai/introduction/coding-agents) for the model behind your coding agent. The docs push two patterns: [routers](https://docs.typesafe.ai/patterns/intent-routing) sending a request to code, a specialist LLM or a human, and [guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails) that screen what goes in and out of an LLM.

Sean Goedecke adds [two techniques](https://www.seangoedecke.com/two-techniques-for-working-with-system-one-models/) of his own. Tiered goals: a slow loop picks a goal from time to time, and a fast one decides each move toward it. Tournament sampling: when the options go past the 255-choice limit, Jev first picks among subsets, then among the winners.

They also have a candid page about [Jev 1.13's jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13). It reads instructions literally, it's weak at math, counting and dates, a large irrelevant state hurts it, prompt injection "can move the answer", and two Nouls meant to be opposites can sum to 1.19. Simon Willison adds a point worth keeping in mind: when all you get back is a number, a bias is much harder to see.

The first independent tests draw a more nuanced picture. [PriorBench](https://github.com/priorbench/jev), a pre-registered evaluation of 5,721 calls, measured 95.9% right answers on its benchmark, with numbers and dates handled better than the jaggedness page says. But Jev "always answers": without a "none of these" option, a cake recipe became a technical issue at 0.94 confidence.

Its advice: gate at 0.99, or not at all. Alex Molas goes further in [Jev Can't Be Calibrated](https://www.alexmolas.com/2026/09/23/jev-cant-be-calibrated.html): calibration depends on your data, not only on the model, so a few hundred labelled examples of your own are still needed to recalibrate Jev's probabilities.

## How long before efficient open self-hosted Jev?

What TypeSafe team will face is that some of these questions shouldn't leave your machine. Pattern matching catches credentials with a recognizable shape, like an AWS key starting with `AKIA`, but "log in as root with Summer2026" has none. Asking a model is the obvious next step, and that model belongs on my machine or my own servers, not behind someone else's API.

The other risk for TypeSafe is competition. A post widely discussed on HN [bets that OpenAI could fast-follow Jev](https://arcturus-labs.com/blog/2026/09/21/will-openai-eat-jevs-lunch/): in its author's view, big labs already read token probabilities, have models and GPUs to do the rest. TypeSafe counts on its training data to stay ahead.

Open models aimed at a single judgement already exist: [Llama Guard](https://huggingface.co/meta-llama/Llama-Guard-3-8B), [ShieldGemma](https://huggingface.co/google/shieldgemma-2b) or [Granite Guardian](https://huggingface.co/ibm-granite/granite-guardian-3.0-8b) for safety, and zero-shot classifiers such as [bart-large-mnli](https://huggingface.co/facebook/bart-large-mnli) since 2022. What Jev adds is any question, written at runtime, answered with a calibrated probability.

TypeSafe itself ships an [adapter](https://github.com/typesafe-ai/system-one-adapter-python) that answers Jev's interface with OpenAI, Anthropic or Gemini models, to compare cost, speed and quality. The interface is the easy part to copy.

Open source didn't even wait a week. [kev](https://github.com/jaredpalmer/kev) ships 0.8B, 4B and 9B models on top of Qwen3.5, with the same API as Jev, running on CUDA, ROCm or Apple Silicon, the 4B and 9B fitting a 32 GB Mac. [SemIf](https://github.com/TheoLeeCJ/SemIf) promises "semantic ifs from open models, on a 3090 at home".

[Jev in 25 Lines of Python](https://www.nobodywho.ai/posts/jev-in-25-lines/) rebuilds the idea with a 600M-parameter Qwen3 running locally through llama.cpp, without any calibration. [JevK5](https://github.com/allebee/jevk5) goes further, with Apache 2.0 weights and a server that speaks Jev's API, within about a point of Jev on the independent JevBench ranking.

[mini-jev](https://github.com/r-ms/mini-jev) measured the trick on a frozen Qwen3-4B: reading the logits of the option letters gives the same accuracy as generating JSON (0.907 against 0.909 on intent), up to four times faster on short texts. Its author warns those scores are "not calibrated probabilities".

Some didn't wait for Jev at all. [Laya](https://laya.convaiinnovations.com/), built a year ago [according to its author](https://news.ycombinator.com/item?id=49765348), offers small decision models (421M and 322M parameters) trained with reinforcement learning, with the same three kinds of questions. [laya-mlx](https://github.com/mizorewww/laya-mlx) runs them natively on Apple Silicon, offline once the weights are downloaded, in 7 to 14 ms per short decision on an M3 Max according to its README, while [laya-server](https://github.com/1Panel-dev/laya-server) packages them as a self-hosted API, compatible with Jev's request format.

TypeSafe keeps its Calibration recipe to itself, as it's the hard part: its CEO says the architecture is ["close to the chest for now"](https://news.ycombinator.com/item?id=49718824). Laya ships its own calibration, so it will be interesting to put it to the test against Jev. Let's do that soon. But I'd bet that, at least, a small local judge will do this kind of job better than today's LLMs, and that would be impressive.

## shouldi, a second opinion before you hit send

With all that said, it's time to wrap up and code. I spent some time these last few days testing Jev: what it can do, what it brings, and above all a use case that makes those possibilities easy to grasp. Along the way, one of my demos imitated a Slack input box, scoring the tone of a message as you type and guessing the emoji reaction it would get.

It's close to a family of projects that keep popping up lately, using machines to help humans talk to each other better. A colleague of mine even wrote [friendly](https://github.com/KannarFr/friendly), a Wayland overlay that rewrites a dictated message in the tone you pick, with Claude Code doing the thinking.

I wanted Jev to answer an earlier question: should this message go out at all, given who will read it and a set of criteria? That's how shouldi was born. It tells you what could land badly and, when you shouldn't send it as is, proposes a rewrite.

It's also a good example of a handover between Jev and an LLM. Jev qualifies the message, the LLM rewrites it, and the loop goes on until the result is judged socially safer. A bit bland, sure (imagine that in a Neuralink).

Here's how shouldi splits the work. Jev first scores the message on 11 criteria in a single request (hostility, passive-aggressiveness, sarcasm, blame, "would you be comfortable if it were forwarded", clarity, sensitive data...), for the audience you pick. 

Code handles what it does better: capital letters, `!!!`, credentials with a recognizable shape, length. The worst signal sets the verdict. When the message shouldn't go out as is, Mistral (`mistral-small-latest`) drafts two rewrites. Jev scores each one like the original, then compares it to what you wrote: same facts, same requests, same intent, nothing added, same language. Up to three rounds, until a rewrite is both safe and faithful.

Why the small model? On eight test messages, it kept the meaning at least as well as `mistral-large-latest` (the large one invented context more often), in half the time and for about a third of the cost. Eight messages prove nothing, but it matches the use case.

The LLM writes, Jev judges, the code decides. Once shouldi is running (the [README](https://github.com/davlgd/shouldi#run-it) has the setup steps), the server streams each step as NDJSON. Here is a run on the message from the first example:

```bash
$ curl -sN localhost:8080/api/check \
    -H 'Content-Type: application/json' \
    -d '{"audience": "team", "message": "As I already said in my previous message, the deploy is blocked until someone actually reads the runbook."}' \
  | jq -c 'select(.type == "report" or .type == "candidate")
      | if .type == "report" then {verdict: .report.verdict, risk: (.report.risk * 100 | round / 100)}
        else {verdict: .candidate.report.verdict, faithful: .candidate.faithful, keeps_requests: .candidate.fidelity.keeps_requests, text: .candidate.text} end'
{"verdict":"dont","risk":0.8}
{"verdict":"review","faithful":true,"keeps_requests":0.8,"text":"The deploy is blocked until someone reads the runbook."}
{"verdict":"review","faithful":true,"keeps_requests":0.83,"text":"The deploy is blocked until someone reviews the runbook."}
{"verdict":"review","faithful":false,"keeps_requests":0.77,"text":"The deploy is blocked until the runbook is reviewed."}
{"verdict":"send","faithful":true,"keeps_requests":0.83,"text":"The deployment is blocked until someone has reviewed the runbook."}
```

The `risk` is shouldi's own score (the worst weighted signal), not a probability. The original gets 0.8, hostility first. In the first round, both drafts keep the meaning but still sound curt, so shouldi starts a second one, telling Mistral what went wrong.

There, the first draft drops "someone": Jev isn't confident the request survives (0.77, under 0.8), and it's set aside. The second one passes both tests, and the loop stops. The line is thin, though: "someone reviews" scores 0.41 of risk, "someone has reviewed" 0.39, on both sides of my 0.4 threshold. The whole run took 2.4 s. Nine Jev requests for 5,288 tokens cost about $0.00022, and the four Mistral calls about $0.00064.

## What shouldi taught me about Jev

Jev reads questions to the letter. In the Slack demo, a question about messages that "blame or single out someone" flagged a simple thank-you to @sam, until I reworded it. With Jev, writing the question is half the work, and setting the thresholds is the other half.

Then, a 0.5 isn't a yes. The first version of shouldi accepted a rewrite as soon as Jev leaned towards "faithful". That's how a draft turning "4k/month" into "$4,000" got through, along with one that softened "Fix it or we cancel". Jev judged both faithful, and numbers are precisely one of its documented weak spots.

So "faithful" now has to mean confident: at least 0.8 on what must be kept, at most 0.2 on what was added. And what code checks better stays in code: numbers, currencies, time zones, month names, links, @mentions and the French *tu*/*vous*. Jev judges the meaning, not the digits. The small model helps too: it keeps "4k/month" as is.

Jev can also feed the LLM. The small model sometimes translated English into French, so Jev now tells which language the draft is in, as one more question in the first request, and shouldi passes it on to Mistral. Since then, 20 rewrites out of 20 stayed in their original language. 

And sometimes, not knowing is the right answer. On the Kevin message, the published version goes through three rounds in 3 to 4 s, with 9 to 11 Jev requests, and no draft makes it.

The drafts that keep "Who approved Kevin's merge rights?" keep the blame too, and still get a "don't send". The ones that soften it lose the request, and Jev notices. Instead of picking one anyway, shouldi shows its best attempt with what still needs a look: "Still worth a read" when the meaning is kept but not the tone, "Compare with your draft" when the meaning drifted.

It may be the calibration doing its job, or my thresholds being too strict: on eight test messages, no rewrite was judged ready to send, whatever the model. I can't tell which yet.

The rest is on me. My criteria sometimes pull against each other: I ask shouldi to remove blame, and here the question carries it. My thresholds are tuned on a dozen messages, and the LLM's drafts change from one run to the next.

Last, your messages go to TypeSafe and, when a rewrite is needed, to Mistral. That includes the check for secrets, and it's the part I like least. The server keeps no message history; switching languages carries the draft through the tab's session storage, and that's it.

shouldi is [on GitHub](https://github.com/davlgd/shouldi). Try it on your own messages, and tell me where Jev gets it wrong. As for me, I still read the rewrite before copying it 😉
