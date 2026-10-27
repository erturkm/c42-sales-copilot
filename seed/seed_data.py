"""Static definitions for the C42 Sales Copilot demo seed."""
TAG = "[C42SEED]"
ADMIN = "12b9b910-8b58-f011-877a-6045bd8f8274"
USD = "c1d9412c-2c59-f011-877a-6045bd8f8274"  # org base currency ("USD", symbol $, rate 1.0)
COMPASS_PL = "972c2497-7048-f111-bec7-000d3abb07c3"
UOM = "892c2497-7048-f111-bec7-000d3abb07c3"
# product GUIDs (existing catalog)
P = {
 "gpt5_in": "80f92a9d-7048-f111-bec7-000d3abb07c3", "gpt5_out": "8df92a9d-7048-f111-bec7-000d3abb07c3",
 "ar41_in": "08fa2a9d-7048-f111-bec7-000d3abb07c3", "ar41_out": "14fa2a9d-7048-f111-bec7-000d3abb07c3",
 "oss120_in": "1b2c1eaf-7048-f111-bec7-000d3abb07c3", "oss120_out": "2b2c1eaf-7048-f111-bec7-000d3abb07c3",
 "oss20_in": "3e2c1eaf-7048-f111-bec7-000d3abb07c3", "gpt54_in": "a22c2497-7048-f111-bec7-000d3abb07c3",
 "h100": "e305a85c-125f-f111-ab0c-7c1e52847c61", "azlocal": "902e70a9-c3d1-f111-a05b-7c1e52847c61",
 "landing": "9a2e70a9-c3d1-f111-a05b-7c1e52847c61", "ptu": "421603a3-c3d1-f111-a05b-7c1e52847c61",
 "purview": "4c8d0e08-c4d1-f111-a05b-7c1e52847c61", "impl": "9a20127d-125f-f111-ab0c-7c1e52847c61",
 "mgdops": "bb771d83-125f-f111-ab0c-7c1e52847c61",
}
FAM = {"Compass": 100000000, "AI Cloud GPU": 100000001, "Sovereign Cloud": 100000002, "Insight": 100000003, "Professional Services": 100000004}
ST = {"Active": 100000000, "Pilot": 100000001, "Renewal Due": 100000002, "Churn Risk": 100000003, "Expired": 100000004}
BUNDLES = {"h100": "Core42 GPU Compute Stack (H100 SXM5)", "h100ai": "Core42 AI Compute Stack (H100 SXM5)", "b100": "Core42 GPU Compute Stack - B100",
           "b200": "Core42 GPU Compute Stack (B200)", "slm": "SLM Development POC Bundle"}

# ind: industrycode ; tiers: c42_customertier(100000000 VIP/100000001 Std), incpt_customertier (723720000..03), ai maturity (723720000..03)
# subs: (name, family, service, product, status, start, end, commit, units, unit_label, region, base_monthly_util, growth, shape)
ACCOUNTS = [
 dict(key="ehsn", name="Emirates Health Sovereign Network", flagship=True, ind=11, rev=2400000000, emp=18500, city="Abu Dhabi", country="United Arab Emirates", web="https://www.ehsn.example.com", dom="ehsn.example.com",
      desc="UAE government health authority operating a federated network of public hospitals and clinics. Sovereign AI for clinical decision support, Arabic/English patient engagement and population-health analytics. Flagship Core42 customer.",
      vip=True, tier=723720003, ai=723720002, arr=7_980_000, phone="+971 2 410 5000",
      contacts=[("Dr. Maryam","Al Hammadi","Chief Executive Officer"),("Khalid","Al Suwaidi","Chief Technology Officer (Executive Sponsor)"),("Dr. Noura","Al Kaabi","Chief Digital & Data Officer"),
                ("Rashed","Al Mansoori","Chief Information Security Officer"),("Hessa","Al Tenaiji","Head of Procurement"),("Dr. Omar","Siddiqui","Director, Clinical AI Programme")]),
 dict(key="annb", name="Al Noor National Bank", ind=16, rev=5200000000, emp=7200, city="Dubai", country="United Arab Emirates", web="https://www.alnoorbank.example.com", dom="alnoorbank.example.com",
      desc="Top-5 UAE national bank. Running Arabic-capable GenAI assistants for retail banking and fraud analytics on sovereign infrastructure.",
      vip=True, tier=723720002, ai=723720002, arr=3_150_000, phone="+971 4 300 2200",
      contacts=[("Faisal","Al Mazrouei","Chief Technology Officer (Executive Sponsor)"),("Layla","Haddad","Chief Data Officer"),("Sanjay","Mehta","Chief Information Security Officer"),("Aisha","Al Falasi","Head of Procurement"),("Tariq","Nasser","VP, Digital Banking")]),
 dict(key="mgeg", name="Meridian Gulf Energy Group", ind=24, rev=18700000000, emp=24000, city="Abu Dhabi", country="United Arab Emirates", web="https://www.meridiangulf.example.com", dom="meridiangulf.example.com",
      desc="Integrated energy major with upstream, downstream and renewables. GPU compute for seismic and reservoir simulation plus AI maintenance copilots.",
      vip=True, tier=723720002, ai=723720001, arr=4_620_000, phone="+971 2 666 1000",
      contacts=[("Saeed","Al Dhaheri","Chief Digital Officer (Executive Sponsor)"),("Priya","Venkataraman","Head of Subsurface Computing"),("Mohammed","Al Ketbi","Chief Information Security Officer"),("Elena","Petrova","Procurement Director"),("Jamal","Al Marri","VP, Technology Infrastructure")]),
 dict(key="smg", name="Savanna Mobile Group", ind=6, rev=1900000000, emp=9800, city="Nairobi", country="Kenya", web="https://www.savannamobile.example.com", dom="savannamobile.example.com",
      desc="Pan-African mobile operator across 9 markets. Piloting Compass-hosted LLMs for multilingual customer care and network analytics.",
      vip=False, tier=723720001, ai=723720001, arr=1_240_000, phone="+254 20 555 0100",
      contacts=[("Wanjiru","Kamau","Chief Technology Officer (Executive Sponsor)"),("David","Otieno","Chief Data Officer"),("Amina","Hassan","Head of Cybersecurity"),("Peter","Mwangi","Head of Procurement")]),
 dict(key="fdsa", name="Federal Digital Services Authority", ind=27, rev=950000000, emp=2100, city="Abu Dhabi", country="United Arab Emirates", web="https://www.fdsa.example.com", dom="fdsa.example.com",
      desc="Government digital agency delivering citizen services. Sovereign public cloud landing zone and Arabic GenAI citizen assistant on Compass.",
      vip=True, tier=723720003, ai=723720002, arr=3_870_000, phone="+971 2 811 4000",
      contacts=[("Sultan","Al Neyadi","Director General (Executive Sponsor)"),("Mariam","Al Shamsi","Chief Technology Officer"),("Yousef","Al Blooshi","Chief Information Security Officer"),("Fatima","Al Zaabi","Head of Procurement"),("Hamdan","Al Ali","Director, AI & Emerging Tech")]),
 dict(key="gfrui", name="Gulf Frontier Research University", ind=27, rev=420000000, emp=3400, city="Sharjah", country="United Arab Emirates", web="https://www.gfru.example.com", dom="gfru.example.com",
      desc="Research university with an AI institute focused on Arabic LLMs, climate and genomics. GPU cluster consumer under a research agreement.",
      vip=False, tier=723720001, ai=723720001, arr=1_020_000, phone="+971 6 515 3000",
      contacts=[("Prof. Ibrahim","Al Qasimi","Vice Chancellor (Executive Sponsor)"),("Dr. Sara","Lindqvist","Director, AI Research Institute"),("Anwar","Khoury","Chief Information Officer"),("Reem","Al Nuaimi","Head of Procurement")]),
 dict(key="ndsc", name="New Delta Smart City Developers", ind=29, rev=1300000000, emp=2600, city="Cairo", country="Egypt", web="https://www.newdeltacity.example.com", dom="newdeltacity.example.com",
      desc="Master developer of a 40km2 smart-city in the Nile Delta. Digital-twin, IoT analytics and resident-services AI.",
      vip=False, tier=723720000, ai=723720000, arr=380_000, phone="+20 2 3300 7000",
      contacts=[("Omar","El-Sayed","Chief Executive Officer"),("Nadia","Fawzy","Chief Technology Officer (Executive Sponsor)"),("Karim","Abdelrahman","Head of Smart Infrastructure"),("Mona","Ezzat","Procurement Manager")]),
 dict(key="mslg", name="Maritime Silk Ports & Logistics Group", ind=30, rev=3400000000, emp=12500, city="Singapore", country="Singapore", web="https://www.maritimesilk.example.com", dom="maritimesilk.example.com",
      desc="Ports and logistics group operating terminals across the Gulf, East Africa and South-East Asia. AI-driven yard optimisation and customs document automation.",
      vip=False, tier=723720002, ai=723720001, arr=1_760_000, phone="+65 6100 8800",
      contacts=[("Wei Lin","Tan","Chief Digital Officer (Executive Sponsor)"),("Rajesh","Nair","Chief Technology Officer"),("Hannah","Lim","Chief Information Security Officer"),("Ahmed","Al Rumaithi","Head of Procurement"),("Sofia","Marchetti","VP, Terminal Automation")]),
]
# subscriptions: key -> list of (name, family, service, product, status, start, end, commit, units, unit, region, util0, monthly_growth)
def S(name, fam, svc, prod, st, s, e, commit, units, unit, region, u0, g, note=""):
    return dict(name=name, fam=fam, svc=svc, prod=prod, st=st, start=s, end=e, commit=commit, units=units, unit=unit, region=region, u0=u0, g=g, note=note)
SUBS = {
 "ehsn": [
  S("EHSN - Compass GPT-5","Compass","Compass - GPT-5 (Input/Output blend)","gpt5_in","Active","2025-11-01","2027-10-31",900000,257000,"1M tokens","UAE North Sovereign",0.42,0.075,"Clinical documentation & triage copilot."),
  S("EHSN - Compass gpt-oss-120b Core42","Compass","Compass - gpt-oss-120b Core42","oss120_in","Active","2025-11-01","2027-10-31",420000,700000,"1M tokens","UAE North Sovereign",0.50,0.06,"High-volume internal summarisation on Core42-hosted open-weight model."),
  S("EHSN - Compass GPT-4.1 Arabic","Compass","Compass - GPT-4.1 Arabic","ar41_in","Churn Risk","2025-11-01","2027-03-31",360000,100000,"1M tokens","UAE North Sovereign",0.80,-0.09,"Usage declining since Q2 - patient-portal team migrating to gpt-oss-120b; sponsor escalation needed."),
  S("EHSN - AI Cloud H100 Stack","AI Cloud GPU","Core42 GPU Compute Stack (H100 SXM5) - 64 GPU reserved","h100","Active","2025-11-01","2027-10-31",1500000,560640,"GPU-hours","UAE North Sovereign",0.58,0.04,"Reserved 8-node H100 SXM5 cluster for medical-imaging model training."),
  S("EHSN - Sovereign Cloud (Azure Local)","Sovereign Cloud","Sovereign Private Cloud - Azure Local nodes","azlocal","Renewal Due","2024-01-11","2027-01-10",1100000,96,"node-months","UAE Central Sovereign",0.90,0.012,"Renewal in ~75 days; expansion to 12 nodes under discussion."),
  S("EHSN - Insight Analytics Platform","Insight","Core42 Insight - Population Health Analytics","","Active","2025-11-01","2027-10-31",480000,1200,"capacity-unit-months","UAE North Sovereign",0.62,0.035,"Population-health dashboards & data lakehouse."),
  S("EHSN - AI Solutioning (Talent)","Professional Services","Core42 AI Solutioning - man-days","impl","Active","2025-11-01","2026-12-31",840000,600,"man-days","UAE North Sovereign",0.70,0.0,"Embedded AI engineers for clinical AI programme."),
 ],
 "annb": [
  S("ANNB - Compass GPT-5 mini","Compass","Compass - GPT-5 mini","gpt5_in","Active","2026-01-01","2026-12-31",420000,300000,"1M tokens","UAE North Sovereign",0.55,0.07),
  S("ANNB - AI Cloud H100","AI Cloud GPU","Core42 AI Compute Stack (H100 SXM5)","h100","Active","2026-01-01","2027-12-31",1800000,420480,"GPU-hours","UAE North Sovereign",0.65,0.03),
  S("ANNB - Sovereign Landing Zone","Sovereign Cloud","Sovereign Landing Zone (Core42 Sovereign Public Cloud)","landing","Renewal Due","2023-12-01","2026-12-15",930000,12,"managed-service-months","UAE North Sovereign",0.88,0.01,"Renewal due in under 60 days."),
 ],
 "mgeg": [
  S("MGEG - AI Cloud B200 Stack","AI Cloud GPU","Core42 GPU Compute Stack (B200)","h100","Active","2026-03-01","2028-02-29",2900000,350400,"GPU-hours","UAE North Sovereign",0.52,0.06),
  S("MGEG - Compass gpt-oss-120b","Compass","Compass - gpt-oss-120b Core42","oss120_in","Active","2026-03-01","2027-02-28",360000,600000,"1M tokens","UAE North Sovereign",0.45,0.08),
  S("MGEG - Insight Seismic Analytics","Insight","Core42 Insight - Subsurface Data Platform","","Pilot","2026-05-01","2026-12-31",420000,720,"capacity-unit-months","UAE Central Sovereign",0.40,0.09),
  S("MGEG - AI Solutioning","Professional Services","Core42 AI Solutioning - man-days","impl","Active","2026-03-01","2027-02-28",360000,260,"man-days","UAE North Sovereign",0.75,0.0),
 ],
 "smg": [
  S("SMG - Compass GPT-5 mini Pilot","Compass","Compass - GPT-5 mini","gpt5_in","Pilot","2026-05-01","2026-12-31",240000,70000,"1M tokens","Nairobi Edge / UAE North",0.30,0.12,"Pilot for multilingual care bot; 429 throttling raised."),
  S("SMG - Compass gpt-oss-20b","Compass","Compass - gpt-oss-20b","oss20_in","Active","2026-02-01","2027-01-31",180000,500000,"1M tokens","UAE North Sovereign",0.60,0.04),
  S("SMG - Insight Network Analytics","Insight","Core42 Insight - Telecom Network Analytics","","Churn Risk","2025-12-01","2026-11-30",820000,600,"capacity-unit-months","UAE North Sovereign",0.55,-0.07,"Low adoption; CTO exploring alternative vendor."),
 ],
 "fdsa": [
  S("FDSA - Sovereign Public Cloud Landing Zone","Sovereign Cloud","Sovereign Landing Zone (Core42 Sovereign Public Cloud)","landing","Active","2025-07-01","2027-06-30",1700000,12,"managed-service-months","UAE Central Sovereign",0.85,0.015),
  S("FDSA - Compass GPT-4.1 Arabic","Compass","Compass - GPT-4.1 Arabic","ar41_in","Active","2026-01-01","2026-12-31",640000,180000,"1M tokens","UAE North Sovereign",0.60,0.08,"Citizen assistant."),
  S("FDSA - AI Cloud H100 Stack","AI Cloud GPU","Core42 AI Compute Stack (H100 SXM5)","h100","Active","2026-01-01","2027-12-31",1100000,280320,"GPU-hours","UAE North Sovereign",0.62,0.03),
  S("FDSA - Insight Open Data","Insight","Core42 Insight - Government Data Exchange","","Renewal Due","2023-12-20","2026-12-19",430000,480,"capacity-unit-months","UAE North Sovereign",0.82,0.01,"Renewal due in ~53 days."),
 ],
 "gfrui": [
  S("GFRU - Research GPU Cluster (B100)","AI Cloud GPU","Core42 GPU Compute Stack - B100","h100","Active","2026-01-01","2026-12-31",780000,280320,"GPU-hours","UAE North Sovereign",0.48,0.06,"Research agreement - bursty usage around paper deadlines."),
  S("GFRU - Compass gpt-oss-120b","Compass","Compass - gpt-oss-120b Core42","oss120_in","Active","2026-01-01","2026-12-31",120000,200000,"1M tokens","UAE North Sovereign",0.55,0.05),
 ],
 "ndsc": [
  S("NDSC - Compass gpt-oss-20b Pilot","Compass","Compass - gpt-oss-20b","oss20_in","Pilot","2026-05-01","2026-12-31",90000,250000,"1M tokens","UAE North Sovereign",0.35,0.15),
  S("NDSC - SLM Development POC","AI Cloud GPU","SLM Development POC Bundle","h100","Pilot","2026-05-01","2026-11-30",110000,40000,"GPU-hours","UAE North Sovereign",0.60,0.02,"POC for city-operations small language model."),
 ],
 "mslg": [
  S("MSLG - Compass GPT-5","Compass","Compass - GPT-5","gpt5_in","Active","2026-02-01","2027-01-31",380000,110000,"1M tokens","UAE North Sovereign",0.52,0.06),
  S("MSLG - AI Cloud H100 Stack","AI Cloud GPU","Core42 GPU Compute Stack (H100 SXM5)","h100","Active","2026-02-01","2027-12-31",980000,245280,"GPU-hours","UAE North Sovereign",0.57,0.04),
  S("MSLG - AI Solutioning","Professional Services","Core42 AI Solutioning - man-days","impl","Active","2026-02-01","2026-12-31",398000,285,"man-days","Singapore / UAE",0.80,0.0),
 ],
}
# opportunities: (name, value, months_to_close, stage_idx, prob, forecast(0 bestcase,1 commit), bundle_key or None, [(prodkey, qty, unit_price)], desc)
OPEN = {
 "ehsn": [
  ("EHSN - Compass GPT-5 Expansion (all hospitals)", 1_450_000, 3, 2, 70, 1, None, [("gpt5_in", 250000, 2.5), ("gpt5_out", 70000, 10.0)], "Extend Compass GPT-5 to all 41 hospitals. Commit uplift."),
  ("EHSN - H100 Stack Expansion + B200 Pilot", 3_200_000, 6, 1, 45, 0, "h100", [("h100", 1000000, 3.2)], "Add 64 H100 GPUs plus B200 pilot; Bundle: Core42 GPU Compute Stack (H100 SXM5) and Core42 GPU Compute Stack (B200)."),
  ("EHSN - Sovereign Cloud Renewal & Azure Local Expansion", 1_300_000, 2, 2, 85, 1, None, [("azlocal", 108, 12000)], "Renew Azure Local nodes, expand 8 -> 12 nodes."),
 ],
 "annb": [("Al Noor - GenAI Fraud Copilot on Compass", 780_000, 4, 2, 60, 1, None, [("gpt5_in", 150000, 2.5), ("gpt5_out", 40000, 10.0)], "Fraud investigator copilot."),
          ("Al Noor - B200 Training Stack", 2_400_000, 8, 0, 25, 0, "b200", [("h100", 600000, 4.0)], "Bundle: Core42 GPU Compute Stack (B200) for in-house Arabic financial LLM.")],
 "mgeg": [("Meridian - Seismic GPU Burst Capacity", 1_900_000, 5, 1, 50, 0, "h100", [("h100", 700000, 2.7)], "Bundle: Core42 AI Compute Stack (H100 SXM5)."),
          ("Meridian - Maintenance Copilot on Compass", 520_000, 3, 2, 65, 1, None, [("oss120_in", 400000, 0.6), ("oss120_out", 120000, 2.4)], "Field maintenance assistant.")],
 "smg": [("Savanna - Compass Production Rollout", 640_000, 2, 2, 55, 0, None, [("gpt5_in", 120000, 2.5), ("oss20_in", 400000, 0.4)], "Move care bot from pilot to production; resolve rate limits."),
         ("Savanna - Insight Retention Offer", 410_000, 1, 1, 40, 0, None, [], "Retention package for Insight Network Analytics.")],
 "fdsa": [("FDSA - Citizen Assistant Phase 2 (Compass)", 950_000, 3, 2, 75, 1, None, [("ar41_in", 200000, 2.5), ("ar41_out", 60000, 10.0)], "National citizen assistant roll-out."),
          ("FDSA - B100 Sovereign Training Stack", 2_100_000, 9, 0, 20, 0, "b100", [("h100", 500000, 4.2)], "Bundle: Core42 GPU Compute Stack - B100.")],
 "gfrui": [("GFRU - Arabic LLM Research Cluster Extension", 650_000, 4, 1, 50, 0, "b100", [("h100", 250000, 2.6)], "Bundle: Core42 GPU Compute Stack - B100.")],
 "ndsc": [("New Delta - City Operations SLM", 340_000, 6, 1, 35, 0, "slm", [("oss20_in", 300000, 0.4)], "Bundle: SLM Development POC Bundle -> production."),
          ("New Delta - Resident Services Assistant", 180_000, 3, 0, 30, 0, None, [("gpt5_in", 40000, 2.5)], "Arabic/English resident assistant.")],
 "mslg": [("Maritime Silk - Customs Document AI", 720_000, 3, 2, 65, 1, None, [("gpt5_in", 150000, 2.5), ("gpt5_out", 40000, 10.0)], "Customs doc extraction on Compass."),
          ("Maritime Silk - Yard Optimisation GPU Stack", 1_650_000, 7, 1, 40, 0, "h100", [("h100", 520000, 3.0)], "Bundle: Core42 GPU Compute Stack (H100 SXM5).")],
}
# closed won: (name, value, days_ago, prodkey)
WON = {
 "ehsn": [("EHSN - Initial Compass & H100 Platform Deal", 2_900_000, 330), ("EHSN - Insight Analytics Platform", 480_000, 200)],
 "annb": [("Al Noor - Compass GPT-5 mini Launch", 420_000, 290)],
 "mgeg": [("Meridian - B200 Stack Multi-year Deal", 2_900_000, 240), ("Meridian - AI Solutioning Package", 360_000, 235)],
 "smg": [("Savanna - Compass Pilot Agreement", 240_000, 170)],
 "fdsa": [("FDSA - Sovereign Landing Zone", 1_700_000, 480), ("FDSA - Compass Arabic Assistant Phase 1", 640_000, 300)],
 "gfrui": [("GFRU - Research Cluster Agreement", 780_000, 300)],
 "ndsc": [("New Delta - Compass Pilot", 90_000, 110)],
 "mslg": [("Maritime Silk - H100 Stack Agreement", 980_000, 260)],
}
# case templates: (title, desc, priority(1 high,2 normal,3 low), type, resolved?, days_ago)
CASE_POOL = {
 "gpu": ("GPU node provisioning delayed on {w}", "Requested {w} GPU nodes not provisioned within SLA. Customer awaiting capacity confirmation in UAE North Sovereign region.", 1, 2),
 "429": ("Compass {m} returning HTTP 429 token throttling", "Production workload hitting tokens-per-minute limits on Compass model {m}. Customer requests quota increase.", 1, 2),
 "res": ("Data residency confirmation for {s}", "Customer compliance team asks for written confirmation that {s} data and logs remain within UAE sovereign boundary.", 2, 3),
 "bill": ("Invoice discrepancy - Compass usage billing", "Billed token usage differs from customer dashboard by ~4%. Please reconcile.", 3, 1),
 "sso": ("SSO / Entra ID integration for Compass portal", "Customer wants SAML SSO and role mapping for the Compass console.", 2, 3),
 "lat": ("Inference latency spike on {m}", "P95 latency doubled between 14:00 and 16:00 GST on {m}.", 2, 2),
 "nccl": ("InfiniBand / NCCL performance below baseline on H100 cluster", "Multi-node training throughput 18% below benchmark.", 1, 2),
 "onb": ("Onboarding: additional users for Insight workspace", "Request to add 25 analysts and configure row-level security.", 3, 3),
}
CASES = {  # key -> list of (poolkey, fmt, resolved, days_ago)
 "ehsn": [("gpu", {"w":"16 additional H100"}, False, 4), ("429", {"m":"GPT-5"}, True, 21), ("res", {"s":"patient imaging datasets"}, True, 40), ("lat", {"m":"gpt-oss-120b Core42"}, False, 2)],
 "annb": [("429", {"m":"GPT-5 mini"}, False, 3), ("res", {"s":"transaction logs"}, True, 30), ("bill", {}, True, 18)],
 "mgeg": [("nccl", {}, False, 6), ("gpu", {"w":"32 H100"}, True, 25), ("sso", {}, True, 50)],
 "smg": [("429", {"m":"GPT-5 mini"}, False, 5), ("res", {"s":"subscriber data (Kenya DPA)"}, False, 8), ("onb", {}, True, 33)],
 "fdsa": [("res", {"s":"citizen-service conversation logs"}, True, 28), ("lat", {"m":"GPT-4.1 Arabic"}, False, 1), ("gpu", {"w":"8 H100"}, True, 45), ("sso", {}, False, 7)],
 "gfrui": [("nccl", {}, False, 9), ("gpu", {"w":"B100"}, True, 35)],
 "ndsc": [("onb", {}, False, 6), ("res", {"s":"IoT telemetry"}, True, 20)],
 "mslg": [("gpu", {"w":"24 H100"}, False, 3), ("bill", {}, True, 27), ("res", {"s":"customs documents"}, True, 44)],
}
