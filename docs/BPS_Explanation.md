Breakdown Point Score (BPS) – Plain English Version

BPS is just a score that tells you how solid an AI logic unit (called an Atomic) is after it’s been checked.  
Think of it like a health check. The score uses basis points, so 10,000 BPS basically means everything looks perfect.

Why BPS is a thing

The whole point of BPS is to make sure the logic:
- Can actually be reviewed and traced back if something goes wrong
- Still makes sense and follows the expected rules
- Doesn’t slowly degrade over time without anyone noticing

There’s also a strike system tied to it.  
If the score drops too low, the logic gets flagged.  
If that keeps happening, it eventually gets retired for good.

How the audit works

Each Atomic gets reviewed from four different angles so no single check can dominate the result.

Toil  
This one is about efficiency. Are things running cleanly, or is there unnecessary work happening?

Security  
Here they look for obvious holes, risky assumptions, or anything that could be abused.

Economy  
This checks whether the money-related logic makes sense — fee splits, royalties, IP rules, that kind of stuff.

Structure  
Basically: is the logic well-built? Are schemas followed? Does everything stay consistent internally?

Each of these gives a score between 0 and 10,000.

Final BPS and strikes

All four scores are combined to get the final BPS.  
Most of the time it’s just a straight average, unless there’s a reason to care more about one area.

The rules are simple:
- 7800 or above: you’re good
- Below 7800: that’s one strike
- Three strikes: the logic is deprecated and done

Quick example

Say the scores look like this:
- Toil: 8200
- Security: 7900
- Economy: 8500
- Structure: 8000

Average them out and you get 8150 BPS.  
That means the logic still passes, no issue.

One last thing

The system is meant to be strict on purpose. Multiple checks, multiple angles, less room for bias.  
The strike system also forces ongoing quality instead of a one-time approval.  
This write-up is just a human-friendly overview to go along with the real technical doc (Technical Specification V42 – Granite).
