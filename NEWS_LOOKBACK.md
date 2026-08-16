# News lookback test: results

Raw results for RESEARCH_LOG.md finding 13. Machine readable copy: `data/news_lookback.json`. Pre-registration: `decisions/ADR-005-news-lookback-preregistration.md`, committed before the search ran.

Window 2026-08-10 to 2026-08-14. Search range 2026-08-03 to 2026-08-14, derived from the seven day trailing mean rather than chosen. 30 movers clearing the 3 pick bar, each matched to a control moving under 1 pick at the nearest current ADP. Searched by four agents with no repo access, given only names, positions and teams in random order, under an identical protocol: three fixed queries per player, at most three fetches, one published definition of a news event, one syndication rule, publication dates read off the page.

---

## Verdict against the pre-registered rule

ADR-005 required BOTH: a gap of at least 25 points across all pairs, AND the direction holding among the well matched pairs alone.

| | movers | controls | gap |
|---|---|---|---|
| All 30 pairs | 23/30, 77% | 18/30, 60% | **+16.7 pts** |
| Well matched 22 | 16/22, 73% | 15/22, 68% | **+4.5 pts** |
| Flagged 8 | 7/8, 88% | 3/8, 38% | +50.0 pts |

Condition 1 **FAILS** at +16.7 against a +25 bar. Condition 2 passes on direction only. **Verdict: inconclusive at this sample size**, which is what ADR-005 said a result this size would be.

McNemar exact on the paired data: **p = 0.27** across all pairs, **p = 1.00** among the well matched, on 9 discordant pairs. There is no detectable effect.

The all-pairs gap is carried almost entirely by the 8 flagged pairs at +50, which are deep movers matched to shallow controls because the control pool ran out past pick 150. Separating them was decided before any number existed.

## Second test, pre-registered: how close the news falls to the window end

| | n | median days before Aug 14 | mean | within 3 days |
|---|---|---|---|---|
| All, movers | 23 | 3 | 4.57 | 12/23 = 52% |
| All, controls | 18 | 5 | 5.56 | 6/18 = 33% |
| Well matched, movers | 16 | 4 | 4.75 | 7/16 = 44% |
| Well matched, controls | 15 | 5 | 6.00 | 4/15 = 27% |

Direction is as a trailing mean predicts and holds in both subsets. Permutation test: **p = 0.19** all pairs, **p = 0.17** well matched. Directionally consistent, statistically nothing at this size. This is the version of the test worth rerunning with more snapshots.

## The matching premise did not hold

Controls were matched on ADP because news coverage was assumed to track prominence. For events it does not; the relationship is an inverted U.

| ADP band | hit rate |
|---|---|
| 0 to 39 | 1/2 = 50% |
| 40 to 79 | 5/9 = 56% |
| 80 to 119 | 16/21 = 76% |
| 120 to 159 | 17/23 = 74% |
| 160 to 199 | 2/5 = 40% |

Early-round players have settled roles and generate few role-change events; deep players get little coverage. Event news concentrates in the contested middle. Matching on ADP still equalises position on that curve, so the design holds, but not for the stated reason.

## Base rate

**41 of 60 players, 68%, had a qualifying news event in the twelve day range.** In August, news about an arbitrary skill player is close to ubiquitous, so presence of news carries almost no information about whether a price moved. Any evidence tier that flips on 'a catalyst exists' is largely reporting this number.

---

## All 60 results

Sorted by pair. `Move` is the ADP change across the window; positive means drafted earlier, which is more expensive. `Gap` is how far apart the matched pair sits on current ADP.

| Pair | Group | Player | Pos | Team | ADP | Move | Gap | Match | Result | Date | Days before end | Category |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **M** | Rachaad White | RB | WAS | 102.5 | -3.7 | 0.1 | well | FOUND | 2026-08-10 | 4 | depth-chart |
| 1 | N | Jaxson Dart | QB | NYG | 102.6 | +0.4 | 0.1 | well | FOUND | 2026-08-05 | 9 | discipline |
| 2 | **M** | Dallas Goedert | TE | PHI | 111.2 | -7.2 | 0.2 | well | FOUND | 2026-08-13 | 1 | usage |
| 2 | N | Jacory Croskey-Merritt | RB | WAS | 111.4 | +0.8 | 0.2 | well | FOUND | 2026-08-10 | 4 | depth-chart |
| 3 | **M** | Deebo Samuel Sr. | WR | SF | 102.8 | -7.9 | 0.4 | well | FOUND | 2026-08-11 | 3 | depth-chart |
| 3 | N | Jordan Addison | WR | MIN | 102.4 | +0.7 | 0.4 | well | FOUND | 2026-08-05 | 9 | injury |
| 4 | **M** | Alvin Kamara | RB | NO | 138.6 | -4.7 | 1.2 | well | FOUND | 2026-08-12 | 2 | depth-chart |
| 4 | N | Tyler Shough | QB | NO | 137.4 | -0.8 | 1.2 | well | none |  |  |  |
| 5 | **M** | Jake Ferguson | TE | DAL | 138.0 | +3.5 | 1.9 | well | none |  |  |  |
| 5 | N | Zach Charbonnet | RB | SEA | 139.9 | -0.9 | 1.9 | well | FOUND | 2026-08-05 | 9 | injury |
| 6 | **M** | Isiah Pacheco | RB | DET | 150.3 | -3.0 | 2.0 | well | FOUND | 2026-08-10 | 4 | injury |
| 6 | N | Dalton Kincaid | TE | BUF | 152.3 | +0.3 | 2.0 | well | FOUND | 2026-08-03 | 11 | injury |
| 7 | **M** | Juwan Johnson | TE | NO | 160.1 | -3.5 | 2.1 | well | none |  |  |  |
| 7 | N | Hunter Henry | TE | NE | 158.0 | -0.5 | 2.1 | well | FOUND | 2026-08-10 | 4 | signing |
| 8 | **M** | Jordyn Tyson | WR | NO | 90.5 | -3.9 | 2.4 | well | FOUND | 2026-08-13 | 1 | injury |
| 8 | N | Sam LaPorta | TE | DET | 88.1 | +0.2 | 2.4 | well | none |  |  |  |
| 9 | **M** | Isaiah Likely | TE | NYG | 132.4 | +3.2 | 2.4 | well | FOUND | 2026-08-03 | 11 | usage |
| 9 | N | KC Concepcion | WR | CLE | 130.0 | +0.1 | 2.4 | well | FOUND | 2026-08-03 | 11 | injury |
| 10 | **M** | Stefon Diggs | WR | WAS | 91.3 | -4.4 | 3.3 | well | FOUND | 2026-08-07 | 7 | signing |
| 10 | N | Kenny Gainwell | RB | TB | 88.0 | +0.7 | 3.3 | well | FOUND | 2026-08-09 | 5 | usage |
| 11 | **M** | Jadarian Price | RB | SEA | 72.0 | -8.5 | 4.2 | well | FOUND | 2026-08-12 | 2 | injury |
| 11 | N | Jaylen Warren | RB | PIT | 67.8 | +0.4 | 4.2 | well | FOUND | 2026-08-05 | 9 | depth-chart |
| 12 | **M** | Brian Thomas Jr. | WR | JAX | 77.0 | +5.2 | 4.3 | well | none |  |  |  |
| 12 | N | Michael Pittman Jr. | WR | PIT | 72.7 | -0.3 | 4.3 | well | FOUND | 2026-08-10 | 4 | injury |
| 13 | **M** | Jayden Higgins | WR | HOU | 133.3 | +3.2 | 4.3 | well | FOUND | 2026-08-06 | 8 | usage |
| 13 | N | Baker Mayfield | QB | TB | 129.0 | -0.2 | 4.3 | well | none |  |  |  |
| 14 | **M** | Daniel Jones | QB | IND | 148.9 | +3.3 | 4.3 | well | FOUND | 2026-08-13 | 1 | usage |
| 14 | N | Kyler Murray | QB | MIN | 144.6 | +0.5 | 4.3 | well | FOUND | 2026-08-11 | 3 | depth-chart |
| 15 | **M** | Aaron Jones Sr. | RB | MIN | 94.1 | -4.7 | 4.5 | well | none |  |  |  |
| 15 | N | Chris Godwin Jr. | WR | TB | 89.6 | +0.8 | 4.5 | well | FOUND | 2026-08-09 | 5 | coaching |
| 16 | **M** | Malik Nabers | WR | NYG | 30.2 | +3.0 | 4.6 | well | FOUND | 2026-08-13 | 1 | injury |
| 16 | N | Kenneth Walker | RB | KC | 25.6 | +0.8 | 4.6 | well | none |  |  |  |
| 17 | **M** | Parker Washington | WR | JAX | 69.7 | +4.3 | 4.6 | well | FOUND | 2026-08-06 | 8 | coaching |
| 17 | N | Tyler Warren | TE | IND | 65.1 | +0.3 | 4.6 | well | FOUND | 2026-08-11 | 3 | coaching |
| 18 | **M** | Rashid Shaheed | WR | SEA | 125.1 | -5.1 | 4.7 | well | FOUND | 2026-08-04 | 10 | usage |
| 18 | N | Bo Nix | QB | DEN | 120.4 | -0.2 | 4.7 | well | FOUND | 2026-08-12 | 2 | coaching |
| 19 | **M** | Jalen McMillan | WR | TB | 151.4 | -3.1 | 4.8 | well | FOUND | 2026-08-06 | 8 | injury |
| 19 | N | Malik Washington | WR | MIA | 156.2 | +0.1 | 4.8 | well | FOUND | 2026-08-12 | 2 | depth-chart |
| 20 | **M** | Josh Downs | WR | IND | 88.5 | +3.6 | 4.8 | well | FOUND | 2026-08-09 | 5 | injury |
| 20 | N | Matthew Stafford | QB | LAR | 83.7 | +0.1 | 4.8 | well | none |  |  |  |
| 21 | **M** | Wan'Dale Robinson | WR | TEN | 75.9 | -5.0 | 4.9 | well | none |  |  |  |
| 21 | N | Rhamondre Stevenson | RB | NE | 71.0 | +0.8 | 4.9 | well | none |  |  |  |
| 22 | **M** | Tank Bigsby | RB | PHI | 159.5 | -6.0 | 5.0 | well | none |  |  |  |
| 22 | N | Brenton Strange | TE | JAX | 164.5 | +0.7 | 5.0 | well | none |  |  |  |
| 23 | **M** | George Kittle | TE | SF | 112.2 | +7.1 | 22.0 | **flagged** | FOUND | 2026-08-11 | 3 | injury |
| 23 | N | Trevor Lawrence | QB | JAX | 90.2 | -0.4 | 22.0 | **flagged** | FOUND | 2026-08-12 | 2 | usage |
| 24 | **M** | Kyle Monangai | RB | CHI | 105.4 | -5.8 | 22.1 | **flagged** | FOUND | 2026-08-03 | 11 | injury |
| 24 | N | RJ Harvey | RB | DEN | 83.3 | -0.3 | 22.1 | **flagged** | none |  |  |  |
| 25 | **M** | Tucker Kraft | TE | GB | 105.4 | +4.1 | 24.0 | **flagged** | FOUND | 2026-08-13 | 1 | injury |
| 25 | N | Harold Fannin Jr. | TE | CLE | 81.4 | +0.5 | 24.0 | **flagged** | none |  |  |  |
| 26 | **M** | Caleb Williams | QB | CHI | 103.1 | +3.8 | 25.6 | **flagged** | FOUND | 2026-08-13 | 1 | usage |
| 26 | N | Kyle Pitts Sr. | TE | ATL | 77.5 | +0.3 | 25.6 | **flagged** | none |  |  |  |
| 27 | **M** | Brian Robinson | RB | ATL | 170.1 | -3.4 | 28.0 | **flagged** | FOUND | 2026-08-12 | 2 | depth-chart |
| 27 | N | Sam Darnold | QB | SEA | 142.1 | -0.8 | 28.0 | **flagged** | FOUND | 2026-08-11 | 3 | coaching |
| 28 | **M** | Denzel Boston | WR | CLE | 152.7 | +3.2 | 31.9 | **flagged** | FOUND | 2026-08-11 | 3 | depth-chart |
| 28 | N | Matthew Golden | WR | GB | 120.8 | -0.4 | 31.9 | **flagged** | FOUND | 2026-08-09 | 5 | injury |
| 29 | **M** | T.J. Hockenson | TE | MIN | 160.2 | -6.1 | 37.6 | **flagged** | none |  |  |  |
| 29 | N | Blake Corum | RB | LAR | 122.6 | -0.3 | 37.6 | **flagged** | none |  |  |  |
| 30 | **M** | Tyler Allgeier | RB | ARI | 167.1 | -3.2 | 44.0 | **flagged** | FOUND | 2026-08-06 | 8 | depth-chart |
| 30 | N | Jordan Mason | RB | MIN | 123.1 | -0.6 | 44.0 | **flagged** | none |  |  |  |

---

## Events found, with sources

| Player | Date | Category | Event | Source |
|---|---|---|---|---|
| Dalton Kincaid | 2026-08-03 | injury | Trainers examined his left knee after he went down at practice; non-serious, he returned. | [link](https://sports.yahoo.com/articles/bills-injury-scare-dalton-kincaid-145948221.html) |
| Isaiah Likely | 2026-08-03 | usage | Giants appear intent on featuring Likely as a prominent target, per SNY's Connor Hughes. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-03/giants-appear-intent-on-featuring-likely) |
| KC Concepcion | 2026-08-03 | injury | Left Monday's practice with a shoulder injury after a hard fall; team expects him to be fine. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-03/kc-concepcion-injures-shoulder-on-monday) |
| Kyle Monangai | 2026-08-03 | injury | Sidelined by a soft-tissue injury since day one, designated day to day, returned in full pads. | [link](https://chicago.suntimes.com/bears/2026/08/03/bears-training-camp-report-practice-no-5-rb-kyle-monangai-back-in-action) |
| Rashid Shaheed | 2026-08-04 | usage | Camp reporting described a clear increase in his passing-game role. | [link](https://seachickens.com/daily-feed/2026-08-04-shaheed-finally-went-deep/) |
| Jaxson Dart | 2026-08-05 | discipline | Threw the ball at a defender's helmet; Harbaugh moved the extra point back 15 yards to simulate a taunting penalty. | [link](https://www.yardbarker.com/nfl/articles/jaxson_dart_training_camp_incident_may_spark_conversations_about_giants_qbs_maturity/s1_13132_44140957) |
| Jordan Addison | 2026-08-05 | injury | Kevin O'Connell said a jammed thumb kept him out of team drills and is not serious. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-05/koc-jordan-addison-thumb-injury-not-serious) |
| Zach Charbonnet | 2026-08-05 | injury | Mike Macdonald gave an on-record ACL rehab update, still on active/PUP. | [link](https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/mike-macdonald-provides-update-on-zach-charbonnets-rehab) |
| Jaylen Warren | 2026-08-05 | depth-chart | Listed as the starting RB1 on the Steelers first 2026 depth chart. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-05/steelers-list-warren-as-rb1-on-first-depth-chart) |
| Jayden Higgins | 2026-08-06 | usage | Texans OC Nick Caley said Higgins is now playing on the perimeter and inside, an expanded role. | [link](https://sports.yahoo.com/articles/jayden-higgins-wants-dominate-2-110100551.html) |
| Parker Washington | 2026-08-06 | coaching | ST coordinator Heath Farwell said he is being considered for expanded punt-return duties. | [link](https://blackandteal.com/parker-washington-isn-t-backing-down-as-jaguars-workload-keeps-growing-heath-farwell-punt-returner) |
| Jalen McMillan | 2026-08-06 | injury | Knee injury, did not practice Thursday; Todd Bowles said he was not sure how long. | [link](https://www.rotowire.com/football/headlines/jalen-mcmillan-injury-remains-sidelined-at-practice-632775) |
| Tyler Allgeier | 2026-08-06 | depth-chart | Cardinals first depth chart lists him as the No. 1 RB, rookie Jeremiyah Love second. | [link](https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/cardinals-depth-chart-lists-tyler-allgeier-as-no-1-rb-jeremiyah-love-as-no-2) |
| Stefon Diggs | 2026-08-07 | signing | Commanders officially announced the signing, worth up to $12 million; agreement reached two days earlier. | [link](https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/commanders-make-stefon-diggs-signing-official) |
| Kenny Gainwell | 2026-08-09 | usage | Emerged as a dynamic receiving back during camp, per Pewter Report. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-09/gainwell-emerging-as-a-dynamic-receiving-back) |
| Chris Godwin Jr. | 2026-08-09 | coaching | Todd Bowles said on record that Godwin is healthier than in the previous two seasons. | [link](https://www.buccaneers.com/news/training-camp-takeaways-practice-day-10-2026) |
| Josh Downs | 2026-08-09 | injury | Groin injury, missed a second straight Colts session. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-09/josh-downs-groin-sidelined-again-on-sunday) |
| Matthew Golden | 2026-08-09 | injury | Did not practice Sunday with a toe injury per Rob Demovsky; returned Aug 11. | [link](https://www.fantasypros.com/nfl/news/601436/matthew-golden-not-practicing-sunday.php) |
| Rachaad White | 2026-08-10 | depth-chart | Commanders first unofficial depth chart lists him RB2 behind Jacory Croskey-Merritt. | [link](https://www.commanders.com/news/commanders-release-2026-unofficial-depth-chart) |
| Jacory Croskey-Merritt | 2026-08-10 | depth-chart | Commanders first unofficial depth chart lists him as the starting RB ahead of Rachaad White. | [link](https://www.commanders.com/news/commanders-release-2026-unofficial-depth-chart) |
| Isiah Pacheco | 2026-08-10 | injury | MCL sprain in camp; Dan Campbell said they feel pretty good about him being ready. | [link](https://sports.yahoo.com/articles/lions-isiah-pacheco-miss-time-162921176.html) |
| Hunter Henry | 2026-08-10 | signing | Patriots signed him to a two-year, $16 million extension. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-10/patriots-sign-hunter-henry-to-two-year-extension) |
| Michael Pittman Jr. | 2026-08-10 | injury | Mike McCarthy confirmed he was banged up (right leg) and would not practice Monday. | [link](https://steelersdepot.com/2026/08/mike-mccarthy-provides-injury-updates-on-max-iheanachor-michael-pittman-jr/) |
| Deebo Samuel Sr. | 2026-08-11 | depth-chart | 49ers first unofficial depth chart slots him at Z receiver, filling in for injured Ricky Pearsall. | [link](https://sports.yahoo.com/articles/49ers-release-first-unofficial-depth-170109942.html) |
| Kyler Murray | 2026-08-11 | depth-chart | Kevin O'Connell named Murray the starting quarterback for 2026. | [link](https://www.vikings.com/news/kyler-murray-quarterback-starting-2026-nfl-season) |
| Tyler Warren | 2026-08-11 | coaching | Shane Steichen said Warren has been outstanding all of fall camp, in line for a bigger role. | [link](https://atozsports.com/nfl/indianapolis-colts-news/daniel-jones-and-tyler-warrens-big-days-highlight-top-takeaways-from-colts-patriots-joint-practice-session/) |
| George Kittle | 2026-08-11 | injury | 49ers said Kittle is making terrific progress in his Achilles rehab and is trending toward a possible Week 1 return. | [link](https://sports.yahoo.com/articles/nfl-news-promising-george-kittle-140414968.html) |
| Sam Darnold | 2026-08-11 | coaching | Mike Macdonald said there is no ceiling on Darnold's development. | [link](https://www.heraldnet.com/2026/08/11/seahawks-sam-darnold-finds-stability-in-seattle/) |
| Denzel Boston | 2026-08-11 | depth-chart | Listed as the No. 1 WR on the Browns early unofficial depth chart. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-11/boston-listed-as-no-1-wr-on-early-depth-chart) |
| Alvin Kamara | 2026-08-12 | depth-chart | Listed as co-RB1 with Travis Etienne on the Saints first unofficial depth chart. | [link](https://www.theundroppables.com/alvin-kamara-listed-as-co-rb1-with-etienne/) |
| Jadarian Price | 2026-08-12 | injury | Returned to a walkthrough practice after missing three sessions with upper-body soreness. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-12/jadarian-price-returns-in-walkthrough-practice) |
| Bo Nix | 2026-08-12 | coaching | Sean Payton said Nix will sit out the preseason opener at Atlanta. | [link](https://www.foxsports.com/articles/nfl/bo-nix-will-sit-out-the-broncos-preseason-opener-at-atlanta-coach-sean-payton-says) |
| Malik Washington | 2026-08-12 | depth-chart | Dolphins first unofficial depth chart lists him as starting slot receiver and primary kick returner. | [link](https://phinphanatic.com/position-by-position-takeaways-from-miami-dolphins-first-unofficial-depth-chart-01kzsyrc9pxp) |
| Trevor Lawrence | 2026-08-12 | usage | Liam Coen decided to sit Lawrence for the preseason opener and both remaining exhibitions. | [link](https://www.rotowire.com/football/headlines/trevor-lawrence-news-sitting-out-preseason-opener-633232) |
| Brian Robinson | 2026-08-12 | depth-chart | Falcons depth chart lists him as backup RB to Bijan Robinson and primary kick returner. | [link](https://www.atlantafalcons.com/news/falcons-depth-chart-preseason-game-vs-denver-broncos) |
| Dallas Goedert | 2026-08-13 | usage | Described a concrete shift in his TE role under new OC Sean Mannion, more run-blocking. | [link](https://www.inquirer.com/eagles/2026-training-camp-tight-end-key-success-dallas-goedert-eli-stowers-20260813.html) |
| Jordyn Tyson | 2026-08-13 | injury | Left Thursday's practice early with a hamstring injury, reported as not super serious. | [link](https://sports.yahoo.com/articles/saints-jordyn-tyson-leaves-practice-162509795.html) |
| Daniel Jones | 2026-08-13 | usage | Shane Steichen said Jones will not play the preseason opener as an Achilles-recovery precaution. | [link](https://bolavip.com/en/nfl/is-daniel-jones-playing-today-colts-starting-qb-vs-patriots-in-2026-nfl-preseason-week-1) |
| Malik Nabers | 2026-08-13 | injury | Took part in team drills in a red non-contact jersey, on track for the opener. | [link](https://www.fantasypros.com/nfl/news/602242/malik-nabers-knee-takes-part-team-drills-thursday.php) |
| Tucker Kraft | 2026-08-13 | injury | Ian Rapoport reported his knee (torn ACL recovery) is on track for Week 1. | [link](https://www.nbcsports.com/fantasy/football/player-news/2026-08-13/rap-tucker-kraft-knee-on-track-to-play-week-1) |
| Caleb Williams | 2026-08-13 | usage | Ben Johnson announced Williams will sit out the preseason opener vs Cleveland. | [link](https://www.shawlocal.com/bears/2026/08/13/chicago-bears-training-camp-update-caleb-williams-some-starters-wont-play-against-browns/) |

## No qualifying event found

Aaron Jones Sr., Baker Mayfield, Blake Corum, Brenton Strange, Brian Thomas Jr., Harold Fannin Jr., Jake Ferguson, Jordan Mason, Juwan Johnson, Kenneth Walker, Kyle Pitts Sr., Matthew Stafford, RJ Harvey, Rhamondre Stevenson, Sam LaPorta, T.J. Hockenson, Tank Bigsby, Tyler Shough, Wan'Dale Robinson

A NONE FOUND is a real result, not a failed search. Each of these was searched under the same three query budget as every other player, and candidates were discarded for confirmed wrong-year dates, for being single-play practice colour rather than an event, or for pages whose publication date could not be read.

## Incidental checks

- **The Diggs date correction holds independently.** A blinded agent with no repo access placed the Commanders signing at 2026-08-07 official announcement, agreement two days earlier. `data/catalysts.json` had carried 2026-08-11 with `verified: true` until it was corrected on 2026-08-14. Two independent routes now agree the original date was wrong.
- **Josh Downs is off by a day.** The bench entry reads 2026-08-08 for the groin injury; the blinded search found 2026-08-09 for a second straight missed session. Same injury, different day of the same story. It is inside the window either way, and it is on the `date_confirmed_on_source: unknown` audit list in VERIFY_CHECKLIST.md.
- **Jaxson Dart returned a different event.** The blinded search found an 08-05 taunting incident; the earlier unblinded search found 08-12 criticism from OC Matt Nagy. Both are real. Two searches under different budgets returning different events for the same player is a caution about treating any single pass as complete coverage.
