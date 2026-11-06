---
title: Spaced Repetition and the Shape of Forgetting
author:
  - Ada Whitfield
  - Tomás Ibarra
date: March 2026
abstract: >
  We revisit the classic forgetting curve using review logs from 4,200
  volunteers learning vocabulary in a second language. Fitting a two-parameter
  power-law model to more than 1.3 million recall attempts, we find that the
  optimal review interval grows roughly geometrically with each successful
  recall, but that the growth factor depends strongly on item difficulty. A
  simple adaptive schedule that estimates difficulty online reduces total
  study time by 23% at equal retention. We discuss implications for the design
  of study software and for classroom practice.
---

# Introduction

Hermann Ebbinghaus published the first quantitative study of memory in 1885, using himself as the only subject and nonsense syllables as material. His central observation, that retention decays rapidly at first and then ever more slowly, has been replicated many times and underpins nearly every modern flashcard application.

What remains contested is the *form* of the decay and how it changes with practice. Exponential models are mathematically convenient, but a growing body of evidence favours power-law forgetting when data are aggregated across items of varying difficulty. In this note we use a large, naturally collected data set to compare the two and to ask a practical question: how long should a learner wait before reviewing an item again?

## Contributions

Our contributions are threefold:

1. We release a cleaned data set of 1.3 million timestamped recall attempts.
2. We show that a power-law model with an item-level difficulty term fits held-out data better than exponential alternatives.
3. We propose a scheduling rule that is simple enough to implement in a few lines of code.

# Method

## Participants and materials

Volunteers were recruited through a free language-learning application and consented to anonymous logging. Each participant studied a deck of 600 Spanish–English word pairs drawn from a frequency list. Items were introduced at a rate of ten per day, and the application scheduled reviews using a fixed doubling rule.

## Model

For an item last reviewed *t* days ago, we model the probability of recall as a power function of elapsed time, scaled by a stability parameter that grows with each successful review. The model is fitted by maximum likelihood; the core of the update is shown below.

```python
def recall_probability(t, stability, decay=0.5):
    """Power-law forgetting curve."""
    return (1 + t / (9 * stability)) ** -decay

def next_interval(stability, target=0.9, decay=0.5):
    return 9 * stability * (target ** (-1 / decay) - 1)
```

### Estimating difficulty

Difficulty is estimated online from the first three recall attempts, using a Bayesian prior centred on the deck average. This lets the schedule adapt after only a few days.

# Results

Table 1 compares the fit of three candidate models on a held-out set of 200,000 attempts. Lower values of log-loss and calibration error are better.

| Model                     | Parameters | Log-loss | Calibration error |
|:--------------------------|-----------:|---------:|------------------:|
| Exponential               |          2 |    0.412 |             0.061 |
| Power law                 |          2 |    0.389 |             0.034 |
| Power law + difficulty    |          3 |    0.371 |             0.018 |

The difficulty-aware model is best on both measures. Importantly, its advantage is concentrated in the hardest decile of items, where fixed schedules most often fail learners.

> The art of remembering is the art of attention, and the art of attention is largely the art of returning at the right moment.

In a simulated comparison, the adaptive schedule reached 90% retention after 60 days with 23% fewer reviews than the doubling rule, while never reviewing easy items more often than once a fortnight.

# Discussion

Our results suggest that study software should spend less effort on easy items and more on a small set of persistently difficult ones. Several caveats apply:

- Volunteers were self-selected and likely more motivated than typical students.
- Vocabulary is an unusually clean domain; conceptual material may behave differently.
- Recall was self-graded, which introduces noise of unknown direction.

# Conclusion

A modest extension of the power-law forgetting curve, with a single item-level difficulty term, is enough to produce noticeably more efficient review schedules. We hope the released data set encourages further work on models that are both accurate and simple to deploy.
