---
title: Cloud Cost Review, Q3 2026
subtitle: Findings and recommendations for the platform engineering group
author:
  - Hannah Mbeki
  - Jonas Weller
date: 14 October 2026
abstract: >
  Cloud spending rose 31% year over year to $1.84M in the third quarter, well
  ahead of the 12% growth in active customers. Three causes account for most of
  the increase: idle staging environments, an unplanned shift to on-demand
  compute after a reserved-instance commitment lapsed, and log retention set far
  beyond what any team uses. We recommend six actions that together should
  reduce quarterly spend by roughly $410K without affecting reliability, and we
  propose a lightweight monthly review to keep costs visible.
---

[TOC]

# Background

The platform engineering group asked for an independent review of cloud costs after two consecutive quarters of spending growth outpaced customer growth. This report covers all production, staging and shared accounts between 1 July and 30 September 2026.

We interviewed the leads of seven product teams, analysed billing exports at the resource level, and compared utilisation data against the commitments in place during the quarter.

## Scope

The review covers compute, storage, managed databases, networking and observability. It excludes the data-science sandbox accounts, which are funded separately and reviewed by the analytics group.

# Key findings

## Spending by category

Compute and observability together make up almost two thirds of the bill. Observability is the fastest-growing category by a wide margin.

| Category          |  Q3 2025 |  Q3 2026 | Change |
|:------------------|---------:|---------:|-------:|
| Compute           |   $612K  |   $798K  |  +30%  |
| Managed databases |   $301K  |   $342K  |  +14%  |
| Observability     |   $148K  |   $296K  | +100%  |
| Storage           |   $221K  |   $246K  |  +11%  |
| Networking        |   $122K  |   $158K  |  +30%  |
| **Total**         | **$1.40M** | **$1.84M** | **+31%** |

## Root causes

1. **Idle staging environments.** Eleven staging stacks ran around the clock, though most were used only during business hours on weekdays.
2. **Lapsed commitments.** A one-year reserved-instance commitment expired in July and was not renewed, moving roughly 60% of steady-state compute to on-demand pricing.
3. **Log retention.** Debug-level logs are retained for 400 days in hot storage. Teams reported never querying logs older than 30 days.

> **Quick win.** Scheduling staging environments to shut down outside 07:00–20:00 on weekdays would save about $38K per quarter and can be rolled out in a single sprint.

# Recommendations

## Immediate actions

- Renew compute commitments for the stable baseline, sized to the 20th percentile of hourly usage
- Apply a 30-day hot retention policy for logs, with 13-month cold archive for audit
- Schedule staging environments to sleep outside working hours
  - Provide a self-service “wake” command for late releases
  - Exempt the two stacks used for overnight load tests

## Ongoing practice

We recommend a 30-minute monthly cost review attended by one engineer from each team. The review should look at a single dashboard and end with at most three actions.

- [x] Billing export enabled at resource level
- [x] Cost allocation tags agreed with team leads
- [ ] Monthly review added to the engineering calendar
- [ ] Budget alerts configured for each account

The retention change can be applied with a single policy update:

```yaml
retention:
  hot_days: 30
  archive:
    tier: cold
    months: 13
  exclude:
    - audit-*
```

# Expected impact

Taken together, the recommendations reduce projected quarterly spend from $1.84M to about $1.43M. The largest single saving comes from renewed commitments, followed by log retention. None of the changes reduce redundancy or alter recovery objectives.

*Prepared for the platform engineering leadership team. Figures are rounded to the nearest thousand dollars.*
