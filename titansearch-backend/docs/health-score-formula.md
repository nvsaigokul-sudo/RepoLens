# Health Score Calculation Heuristics

This document describes how TitanSearch computes its repository health score out of 100. The formula ensures transparency for recruiters, developers, and learners.

## Overall Weightings

The overall score is a weighted average of 5 core metrics:

$$\text{Overall Score} = 0.25 \times \text{Documentation} + 0.25 \times \text{Commit Activity} + 0.15 \times \text{Issues Health} + 0.20 \times \text{Popularity} + 0.15 \times \text{Maturity}$$

---

## 1. Documentation Score (25%)
Measures the completeness of documentation (README length and quality indicators).

* **Baseline README Length**:
  * $< 500$ characters $\to$ 20 points
  * $500 \text{ to } 1999$ characters $\to$ 50 points
  * $2000 \text{ to } 4999$ characters $\to$ 70 points
  * $\ge 5000$ characters $\to$ 80 points
* **Maturity Enhancers**:
  * Presence of `CONTRIBUTING` guide $\to$ +10 points
  * Presence of `LICENSE` $\to$ +10 points
* **Max Score**: 100

---

## 2. Commit Activity Score (25%)
Measures recent active maintenance.

* **Metric**: Total commit count in the last 90 days.
* **Calculation**:
  $$\text{Commit Score} = \min(100, \text{CommitsCount} \times 3.33)$$
  * Projects with $\ge 30$ commits in 90 days score a perfect 100.
* **Max Score**: 100

---

## 3. Issues Health Score (15%)
Penalizes project management backlog (too many open issues relative to project size).

* **Calculation**:
  $$\text{Ratio} = \frac{\text{OpenIssues}}{\frac{\text{Stars}}{100} + 1.0}$$
  $$\text{Issues Score} = 100 - \min(100, \text{Ratio})$$
* **Max Score**: 100

---

## 4. Popularity Score (20%)
Measures industry adoption and community validation.

* **Calculation**:
  $$\text{Popularity Score} = \min\left(100, \text{round}(20.0 \times \ln(\text{Stars} + \text{Forks} + 1.0))\right)$$
  * Projects with $\ge 150$ combined stars/forks score a perfect 100.
* **Max Score**: 100

---

## 5. Maturity Score (15%)
Measures project longevity and stable age, while penalizing total obsolescence.

* **Baseline Age in Months**:
  * $< 3$ months $\to$ 40 points
  * $3 \text{ to } 11$ months $\to$ $40 + (\text{Age} - 3) \times 4.44$ points
  * $12 \text{ to } 60$ months $\to$ 100 points (Optimal range)
  * $61 \text{ to } 120$ months $\to$ 90 points
  * $> 120$ months $\to$ 70 points
* **Staleness Penalty**:
  * If the repository has had no commit activity in the last 12 months $\to$ -30 points penalty.
* **Max Score**: 100
