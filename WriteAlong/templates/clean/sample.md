# Field Notes: Moving to a Four-Day Week

We ran a twelve-week pilot of a four-day working week across the design and support teams. These notes collect what we measured, what surprised us, and what we would change before rolling it out more widely.

## What we tried

Each team chose its own day off, with one rule: **customers should never notice**. Support staggered its schedule so that every weekday had full coverage, while design took Fridays off together and protected Monday mornings for planning.

- Meetings were capped at 25 or 50 minutes
- Status updates moved to a shared document, written by Thursday noon
- “Focus blocks” were added to every calendar
  - Two hours each morning, no notifications
  - Exceptions only for production incidents

## Results at a glance

| Metric                    | Before | Pilot  | Change |
|:--------------------------|-------:|-------:|-------:|
| Tickets resolved per week |    412 |    428 |   +4%  |
| Median first response     | 2h 10m | 1h 55m |  −12%  |
| Design reviews shipped    |     18 |     17 |   −6%  |
| Self-reported burnout     |   3.4  |   2.1  |  −38%  |

The numbers held up better than anyone expected. The one dip, design reviews, recovered in the final four weeks once the team adjusted its planning cadence.

> The extra day didn’t make us lazier. It made us ruthless about what deserved our attention on the other four.
>
> — Priya, Support Lead

## Next steps

1. Share the full report with leadership
2. Extend the pilot to engineering for one quarter
3. Revisit the meeting caps after six months

### Checklist before rollout

- [x] Confirm coverage calendar with support
- [x] Update the holiday policy wording
- [ ] Publish an FAQ for new hires
- [ ] Add a `four-day-week` label to the planning board

---

If you want to reproduce the analysis, the summary script is short:

```python
import pandas as pd

df = pd.read_csv("pilot.csv", parse_dates=["week"])
summary = df.groupby("phase")[["tickets", "first_response_min"]].median()
print(summary.round(1))
```

Questions or ideas? Leave a comment on the planning doc, or find us in *#ways-of-working*.
