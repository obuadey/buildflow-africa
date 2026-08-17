export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  | { type: "callout"; tone: "note" | "warning"; title: string; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "formula"; lines: string[] };

export type Post = {
  slug: string;
  title: string;
  deck: string;
  category: "Estimating" | "Contracts & cash" | "Operations" | "Point of view";
  author: { name: string; role: string };
  date: string;
  readMinutes: number;
  featured?: boolean;
  blocks: Block[];
};

export const CATEGORIES = ["Estimating", "Contracts & cash", "Operations", "Point of view"] as const;

export const POSTS: Post[] = [
  {
    slug: "markup-is-not-margin",
    title: "Markup is not margin, and the difference is your salary",
    deck: "Adding 20% to your cost does not give you a 20% margin. On a GHS 500,000 job that mistake is worth about GHS 16,000  roughly what most small contractors take home in a quarter.",
    category: "Estimating",
    author: { name: "Obed Buadey", role: "Founder, BuildFlow Africa" },
    date: "2026-07-29",
    readMinutes: 6,
    featured: true,
    blocks: [
      { type: "p", text: "Ask ten contractors in Accra what margin they work on and most will say fifteen or twenty percent. Ask them how they arrive at it and nearly all describe the same method: work out the cost, add twenty percent, send the quote. Those two statements cannot both be true, and the gap between them is where a lot of small construction businesses quietly lose money." },
      { type: "h2", text: "The arithmetic, once, properly" },
      { type: "p", text: "Markup is calculated on cost. Margin is calculated on the selling price. They use the same two numbers and produce different answers." },
      { type: "formula", lines: ["markup %  =  (price − cost) ÷ cost × 100", "margin %  =  (price − cost) ÷ price × 100"] },
      { type: "p", text: "Take a job that costs you GHS 400,000 to build. Add a 20% markup and you quote GHS 480,000. Your profit is GHS 80,000  but as a share of the money the client actually pays you, that is 16.7%, not 20%." },
      {
        type: "table",
        head: ["Markup applied", "Cost", "Quoted price", "Profit", "Actual margin"],
        rows: [
          ["10%", "GHS 400,000", "GHS 440,000", "GHS 40,000", "9.1%"],
          ["15%", "GHS 400,000", "GHS 460,000", "GHS 60,000", "13.0%"],
          ["20%", "GHS 400,000", "GHS 480,000", "GHS 80,000", "16.7%"],
          ["25%", "GHS 400,000", "GHS 500,000", "GHS 100,000", "20.0%"],
          ["33.3%", "GHS 400,000", "GHS 533,333", "GHS 133,333", "25.0%"]
        ],
        caption: "The markup you need is always larger than the margin you want."
      },
      { type: "p", text: "Read the last row again. To earn a genuine 25% margin you must add a third onto your cost. Contractors who add 25% and believe they are earning 25% are short by roughly a fifth of their expected profit on every job they win." },
      { type: "h3", text: "The conversion, if you want a specific margin" },
      { type: "formula", lines: ["required markup %  =  margin % ÷ (100 − margin %) × 100", "", "for 20% margin:  20 ÷ 80 × 100  =  25% markup", "for 25% margin:  25 ÷ 75 × 100  =  33.3% markup"] },
      { type: "h2", text: "Where the rest of the money goes" },
      { type: "p", text: "The markup gap is only the first leak. The second is that most estimates price the job but not the business. Site cost is what the work consumes; overhead is what the company consumes while the work happens  the office, the pickup, fuel to and from site, the phone credit, the person who chases invoices, the months when nothing is running." },
      { type: "p", text: "If your overhead is GHS 25,000 a month and you deliver GHS 1.5m of work a year, overhead is about 20% of turnover. A 20% markup with no separate overhead line does not leave you with profit. It leaves you with roughly nothing, and you find out in December." },
      { type: "callout", tone: "warning", title: "The order matters", text: "Overhead recovery goes on before profit, not after. If you apply profit to direct cost and then remember overhead, you have funded your office out of your profit." },
      { type: "formula", lines: ["direct cost      materials + labour + equipment + subcontractors", "+ overhead       recovery of running the business", "+ contingency    for what site will find", "+ profit         what the business earns", "− discount       what you gave away", "= quoted price"] },
      { type: "h2", text: "A worked example on a real shape of job" },
      { type: "p", text: "A four-bedroom residence at shell-and-core, priced from a bill you already have:" },
      {
        type: "table",
        head: ["Line", "Amount", "Basis"],
        rows: [
          ["Materials", "GHS 280,400", "priced from your own supplier rates"],
          ["Labour", "GHS 126,200", "trade rates × measured quantities"],
          ["Equipment", "GHS 34,500", "mixer, vibrator, scaffolding, haulage"],
          ["Subcontractors", "GHS 48,000", "electrical and plumbing first fix"],
          ["Direct cost", "GHS 489,100", "sum of the above"],
          ["Overhead at 8%", "GHS 39,128", "recovery of company running cost"],
          ["Contingency at 3%", "GHS 14,673", "site risk, not profit"],
          ["Profit", "GHS 80,327", "what the business earns"],
          ["Quoted price", "GHS 623,228", ""],
          ["Gross margin", "19.5%", "profit ÷ price"]
        ],
        caption: "Figures are illustrative. Use your own supplier and labour rates."
      },
      { type: "p", text: "Notice that contingency sits with cost, not with profit. If site conditions are kind and you do not spend it, it becomes profit at the end  but it was never yours to spend at the quoting stage." },
      { type: "h2", text: "What to change on Monday" },
      {
        type: "ol",
        items: [
          "Decide the margin you need, then convert it to the markup you must apply. Write both numbers down.",
          "Put overhead on its own line. If you have never measured it, take last year’s office cost and divide by last year’s turnover.",
          "Keep contingency separate from profit, and separate from your markup.",
          "Check the margin on the finished number before the quote leaves your office, not after the job ends."
        ]
      },
      { type: "p", text: "None of this makes you more expensive than your competitors. It makes you accurate about what you are already charging  which is the only position from which you can safely decide to discount." }
    ]
  },
  {
    slug: "pricing-a-boundary-wall",
    title: "How to price a 20-metre boundary wall in twenty minutes",
    deck: "A worked method for the job every contractor in Ghana is asked to price at least once a month  and the six lines that people forget.",
    category: "Estimating",
    author: { name: "Obed Buadey", role: "Founder, BuildFlow Africa" },
    date: "2026-07-15",
    readMinutes: 7,
    blocks: [
      { type: "p", text: "A client calls: 20 metres long, 2.4 metres high, six-inch blocks, plastered and painted both sides, with a gate opening. They want a figure by evening. Here is how to get to a defensible number without opening a fresh spreadsheet." },
      { type: "h2", text: "Step 1: measure once, in areas" },
      { type: "p", text: "Almost everything in a wall is priced by the square metre of wall face, so start there." },
      { type: "formula", lines: ["wall area      = 20 m × 2.4 m            = 48 m²", "less gate      = 3.0 m × 2.1 m           = 6.3 m²", "net wall area                            = 41.7 m²", "plaster/paint  = 41.7 m² × 2 faces       = 83.4 m²"] },
      { type: "callout", tone: "note", title: "Deduct openings once, not twice", text: "Take the gate out of the blockwork and out of the plaster. Leaving it in on both is the most common quantity error on this job, and it inflates your price by about 13%." },
      { type: "h2", text: "Step 2: convert area to materials with fixed factors" },
      { type: "p", text: "These factors barely change from job to job. Once they are written down you never derive them again." },
      {
        type: "table",
        head: ["Item", "Factor", "Quantity for 41.7 m²"],
        rows: [
          ["6-inch blocks", "12.5 per m²", "521 blocks"],
          ["Cement for mortar", "0.35 bag per m²", "15 bags"],
          ["Sand for mortar", "0.02 trip per m²", "0.83 trip"],
          ["Plaster cement", "0.28 bag per m² of face", "23 bags"],
          ["Plaster sand", "0.018 trip per m² of face", "1.5 trips"],
          ["Emulsion paint", "0.02 unit per m² of face", "1.7 units"],
          ["Putty", "0.05 bag per m² of face", "4.2 bags"]
        ],
        caption: "Factors assume standard sandcrete blockwork with 12 mm mortar joints and a 12 mm render."
      },
      { type: "p", text: "Sand and chippings are bought by the trip, not the cubic metre, so round up to whole trips and say so in the quote. Nobody delivers 0.83 of a trip." },
      { type: "h2", text: "Step 3: the foundation nobody quotes" },
      { type: "p", text: "A boundary wall is a structure. It needs excavation, a strip footing, a few courses below ground and  on most Accra plots  columns at intervals to handle wind load and poor ground." },
      {
        type: "ul",
        items: [
          "Excavation: 20 m × 0.6 m wide × 0.6 m deep ≈ 7.2 m³",
          "Strip footing concrete: about 0.18 m³ per metre run ≈ 3.6 m³",
          "Columns: one every 3 m gives 7 columns, each about 0.1 m³ plus reinforcement",
          "Below-ground blockwork: two to three courses across the full length"
        ]
      },
      { type: "h2", text: "Step 4: the six lines that get forgotten" },
      { type: "p", text: "In our own reviews of contractor estimates, these are the omissions that appear most often on wall and fence jobs." },
      {
        type: "ol",
        items: [
          "Haulage. Blocks, sand and chippings arrive on trips. Two or three trips at Accra rates is real money and is nobody’s free delivery.",
          "Waste and breakage. Blocks break in transit and on site. Five to ten percent on blocks and tiles is not padding, it is observation.",
          "Water. Curing a wall in dry season means a tanker, or you accept cracking.",
          "Setting out and site clearing. Half a day of labour before a single block is laid.",
          "Gate and ironmongery. Frame, leaf, hinges and painting  often a third of the wall’s value if the client wants steel.",
          "Site clean-up and disposal. Excavated spoil has to leave the plot."
        ]
      },
      { type: "callout", tone: "warning", title: "Curing is not optional", text: "A wall cured badly in Harmattan will crack, and the client will remember who built it long after they have forgotten what they paid." },
      { type: "h2", text: "Step 5: price it, then check the margin" },
      { type: "p", text: "Apply your own rates to the quantities, add overhead, contingency and the markup that produces the margin you decided on, and then look at the finished number as a rate per square metre of wall. If it is wildly different from the last wall you built, one of your quantities is wrong. That single sanity check catches more errors than re-reading the whole estimate." },
      { type: "quote", text: "The fastest estimators are not the ones who type quickly. They are the ones who never derive the same factor twice.", cite: "A quantity surveyor in Kumasi, on why he keeps a notebook of rates" },
      { type: "h2", text: "Turning this into a repeatable rate" },
      { type: "p", text: "Everything above is repeatable. One square metre of six-inch blockwork always consumes the same blocks, cement, sand and mason hours. Store the rate once and the next wall takes four minutes: measure the area, apply the rate, add the foundation, add the gate, check the margin." }
    ]
  },
  {
    slug: "waste-haulage-breakage",
    title: "Three costs that quietly eat Ghanaian construction margins",
    deck: "Waste, haulage and site loss rarely appear on a bill of quantities. They always appear in the bank account.",
    category: "Estimating",
    author: { name: "Ama Serwaa", role: "Quantity surveyor" },
    date: "2026-06-24",
    readMinutes: 5,
    blocks: [
      { type: "p", text: "When a job comes in under quote it is usually because someone bought well. When a job comes in over quote it is almost never one dramatic overspend. It is three ordinary things that were never priced." },
      { type: "h2", text: "1. Waste is a quantity, not an attitude" },
      { type: "p", text: "Tiles get cut. Blocks break. Cement hardens in a bag left out overnight. Timber is bought in stock lengths and used in awkward ones. None of this is carelessness; it is the physical reality of the trade, and it belongs in the quantity." },
      {
        type: "table",
        head: ["Material", "Typical allowance", "Why"],
        rows: [
          ["Floor tiles 60×60", "8–10%", "cutting at edges, breakage, pattern matching"],
          ["Wall tiles", "10%", "more cuts around fittings"],
          ["Sandcrete blocks", "5%", "transit and handling breakage"],
          ["Cement", "3–5%", "spillage, part bags, hardened stock"],
          ["Roofing sheets", "5–8%", "overlaps and end cuts"],
          ["Reinforcement bar", "3–5%", "off-cuts and laps"],
          ["Paint", "5%", "roller loss, touch-ups, colour matching"]
        ],
        caption: "Allowances to argue with, not to copy blindly. Measure your own sites for a season and replace them."
      },
      { type: "p", text: "On a 180 m² tiling job, forgetting a 10% allowance means buying 18 m² of tile you did not price. At GHS 132 per square metre that is about GHS 2,400  on one trade, on one house." },
      { type: "h2", text: "2. Haulage is priced in trips, not kilometres" },
      { type: "p", text: "Sand, chippings, laterite and blocks arrive by the trip, and the trip price varies with distance, access and how badly the driver wants the work that week. A plot in Tantra Hills with a steep approach is not the same delivery as a plot on the Spintex road, and pretending otherwise is a decision to absorb the difference." },
      {
        type: "ul",
        items: [
          "Count trips explicitly, as line items, with the vehicle named.",
          "Round up. There is no half trip.",
          "Add a mobilisation trip for tools, hoarding and the first materials.",
          "If access is poor, price the head-carry from the road. Labourers moving 500 blocks by hand is a real cost."
        ]
      },
      { type: "h2", text: "3. Site loss is a security cost, not bad luck" },
      { type: "p", text: "Materials disappear from unsecured sites. The industry answer is a watchman, hoarding and a lockable store  all of which cost money that has to be in the preliminaries. A contractor who prices no preliminaries has agreed to fund site security out of profit." },
      { type: "callout", tone: "note", title: "Preliminaries are the first section, not the last", text: "Site setup, hoarding, security, water, temporary power, sanitation and clean-up should be priced before any trade. They are the cost of being allowed to work at all." },
      { type: "h2", text: "What good practice looks like" },
      { type: "p", text: "Put waste in the quantity, not in a mental buffer. Put haulage on its own lines so a client can see it. Put site setup in preliminaries and price it honestly. Every one of these is easier to defend to a client than an unexplained round number at the bottom of a page  and far easier than going back mid-job to ask for more." }
    ]
  },
  {
    slug: "milestone-payment-schedules",
    title: "Milestone payment schedules that keep site work funded",
    deck: "The most common cash-flow problem in small construction is not a client who refuses to pay. It is a schedule that funds the job later than the job spends.",
    category: "Contracts & cash",
    author: { name: "Kwame Asante", role: "Project manager" },
    date: "2026-06-03",
    readMinutes: 6,
    blocks: [
      { type: "p", text: "A contract can be profitable on paper and still put you out of business. Profit is measured at the end; cash is measured every Friday when the masons expect to be paid. A payment schedule is the instrument that reconciles the two, and most are drafted in about four minutes." },
      { type: "h2", text: "Match the money to the spending curve" },
      { type: "p", text: "Construction spending is front-loaded. Foundation and superstructure consume cement, blocks, sand and reinforcement early, while finishing  which the client can see and values most  happens late and costs comparatively less per week." },
      {
        type: "table",
        head: ["Milestone", "Typical share", "What it funds"],
        rows: [
          ["Mobilisation", "20%", "site setup, first material delivery, hoarding, security"],
          ["Foundation complete", "15%", "excavation, concrete, reinforcement, below-ground blockwork"],
          ["Superstructure complete", "20%", "blockwork, columns, lintels, slab"],
          ["Roofing complete", "15%", "timber, sheets, fascia, roofing labour"],
          ["MEP first fix", "10%", "electrical and plumbing subcontractors"],
          ["Finishing", "15%", "plaster, tiling, painting, ceiling"],
          ["Practical completion", "5%", "snagging, clean-up, handover"]
        ],
        caption: "A schedule that has been through several Ghanaian residential jobs. Adjust it; do not adopt it blindly."
      },
      { type: "h2", text: "Rules worth holding" },
      {
        type: "ol",
        items: [
          "Mobilisation must cover the first material order plus site setup. If it does not, you are lending the client money at 0% while paying your suppliers cash.",
          "Tie every milestone to something observable. “Superstructure complete” is checkable; “50% complete” is an argument waiting to happen.",
          "Invoice the day the milestone is met, not the day you remember. Every week of delay is a week of your own capital in the client’s wall.",
          "Keep the final payment small enough that the client releases it, and large enough that you will return to fix the snags."
        ]
      },
      { type: "h2", text: "Retention, and how it bites" },
      { type: "p", text: "A 5% retention on a GHS 850,000 contract is GHS 42,500 held back  typically half released at practical completion and half after the defects period. That is often more than the profit on the job. It is not a problem as long as you knew, priced it, and did not spend it in advance." },
      { type: "callout", tone: "warning", title: "Retention is not a rainy-day fund", text: "It is money you have earned but cannot touch. Track it separately from your bank balance, or you will plan a job around cash you do not have." },
      { type: "h2", text: "When the client pays late anyway" },
      { type: "p", text: "Late payment is a fact of the trade, so build the response into the contract rather than the argument. State the payment period in days. State what happens after it  a pause in works is more effective and more professional than an interest clause nobody enforces. Keep a record of every invoice date, every reminder and every part-payment, because the contractor with dated records is the one who gets paid first when money is tight." },
      { type: "p", text: "None of this is adversarial. Clients generally pay what they understand. A schedule tied to visible milestones, invoiced promptly and recorded properly, is easier to honour than a lump sum that arrives with no explanation." }
    ]
  },
  {
    slug: "variation-orders",
    title: "Charging for variations without losing the client",
    deck: "Scope changes on every job. Whether that costs you money depends entirely on what you do in the first ten minutes after the client asks.",
    category: "Contracts & cash",
    author: { name: "Kwame Asante", role: "Project manager" },
    date: "2026-05-19",
    readMinutes: 5,
    blocks: [
      { type: "p", text: "“While you’re here, can we just…” is the most expensive sentence in construction. Not because clients are unreasonable, but because the work that follows it is usually done before anyone has priced it, and by the time it appears on an invoice it feels to the client like a surprise charge for something they thought was included." },
      { type: "h2", text: "Price it before you build it. Always." },
      { type: "p", text: "A variation priced in advance is a decision. A variation priced afterwards is a dispute. The difference costs nothing except the discipline to stop and write it down." },
      {
        type: "table",
        head: ["Variation VAR-2026-0021", "Amount"],
        rows: [
          ["Original tile allowance (180 m² at GHS 103)", "GHS 18,500"],
          ["Client-selected porcelain (180 m² at GHS 177)", "GHS 31,800"],
          ["Additional laying labour for larger format", "GHS 2,200"],
          ["Net variation", "GHS 15,500"],
          ["Revised contract value", "GHS 865,500"]
        ],
        caption: "Show the original allowance next to the new cost. The client is approving a difference, not a new bill."
      },
      { type: "h2", text: "Write it the way a client reads it" },
      {
        type: "ol",
        items: [
          "What was in the original scope, with the allowance you priced.",
          "What is now being asked for.",
          "The cost difference  materials, labour and any effect on programme.",
          "The revised contract value.",
          "A line for their approval, dated."
        ]
      },
      { type: "callout", tone: "note", title: "Time is part of the variation", text: "If a change adds two weeks, say so in the same document. A client who approves the money but not the delay will hold you to the original completion date." },
      { type: "h2", text: "Never overwrite the original" },
      { type: "p", text: "The original quotation is the record of what was agreed. Variations sit on top of it and adjust the contract value; they do not replace it. When a disagreement comes six months later  and on long jobs it does  the contractor who can show the original document, three numbered variations and the client’s approval on each is not in an argument. They are in a filing exercise." },
      { type: "h2", text: "The variations you should not charge for" },
      { type: "p", text: "There is a category of small change that costs you almost nothing and buys a great deal of goodwill: moving a socket a metre, a slightly different shade, a door swing reversed before the frame is fixed. Absorb them, say clearly that you are absorbing them, and charge properly for the ones that carry real cost. Clients who see you distinguish between the two rarely argue about the second kind." },
      { type: "quote", text: "The client is not resisting the price. They are resisting the surprise.", cite: "Common observation among contractors who have been paid in full" }
    ]
  },
  {
    slug: "price-book-discipline",
    title: "Your price book is a perishable asset",
    deck: "A cement rate from three months ago is not a rate. It is a memory. Here is a maintenance routine that takes twenty minutes a month.",
    category: "Operations",
    author: { name: "Ama Serwaa", role: "Quantity surveyor" },
    date: "2026-05-06",
    readMinutes: 5,
    blocks: [
      { type: "p", text: "Every contractor keeps prices somewhere: a notebook, a WhatsApp thread with a supplier, a spreadsheet from 2023 that three people have edited. The problem is never that the prices do not exist. It is that nobody knows how old they are." },
      { type: "h2", text: "Age is the field that matters most" },
      { type: "p", text: "A rate without a date is unusable. You cannot tell whether it is a bargain or a liability, and you certainly cannot defend it to a client. Every material line should carry the date it was last confirmed and the supplier it came from." },
      {
        type: "table",
        head: ["Age of rate", "Treat it as", "Action before quoting"],
        rows: [
          ["0–30 days", "current", "use it"],
          ["31–60 days", "ageing", "confirm on volatile items  cement, steel, fuel-linked haulage"],
          ["60 days +", "stale", "re-quote with the supplier before it goes in an estimate"]
        ]
      },
      { type: "h2", text: "A twenty-minute monthly routine" },
      {
        type: "ol",
        items: [
          "Sort your materials by date last updated, oldest first.",
          "Take the top twenty. They are almost always the same categories: cement, reinforcement, aggregates, roofing, tiles.",
          "Send one message to each of two suppliers per category. Two quotes is enough to spot a move.",
          "Update the rate, the supplier and the date. Note the delivered price, not the yard price.",
          "Flag anything that moved more than 5% so it gets checked on live estimates."
        ]
      },
      { type: "callout", tone: "warning", title: "Yard price is not delivered price", text: "Blocks at GHS 9.50 in the yard and blocks at GHS 9.50 on your site are different products. Record haulage against the material or price it separately, but never let it vanish." },
      { type: "h2", text: "Price by region, not by country" },
      { type: "p", text: "A national average is a useful backstop and a poor basis for a quotation. Cement in Tamale is not cement in Tema, and aggregate cost is dominated by distance from the quarry. Where you hold a supplier price for the city you are building in, use it; fall back to a regional figure only when you have nothing better, and show clearly which one you used." },
      { type: "h2", text: "Priority order worth adopting" },
      {
        type: "ol",
        items: [
          "A project-specific price you have already negotiated for this job.",
          "Your own current supplier price for that city.",
          "Your own supplier price for the region.",
          "A regional reference price.",
          "A national average  as a placeholder that must be replaced before issue."
        ]
      },
      { type: "p", text: "The discipline is not really about prices. It is about knowing, at the moment you send a quotation, exactly which numbers you trust and which ones you have guessed." }
    ]
  },
  {
    slug: "ai-in-estimating",
    title: "What AI should and should not be allowed to do in an estimate",
    deck: "A language model is very good at remembering that roofing needs labour. It is very bad at knowing what a bag of cement costs in Tema this week. Build the boundary accordingly.",
    category: "Point of view",
    author: { name: "Obed Buadey", role: "Founder, BuildFlow Africa" },
    date: "2026-04-22",
    readMinutes: 6,
    blocks: [
      { type: "p", text: "There is a version of construction software being marketed at the moment that promises to tell you what a building costs from a sentence of description. It is a bad idea, and the reason has nothing to do with whether the technology is impressive." },
      { type: "h2", text: "The failure mode is that it looks right" },
      { type: "p", text: "A model asked for a price will produce one. It will be plausible, it will be formatted confidently, and it will be derived from text rather than from your supplier’s invoice. A wrong quantity is caught by anyone who has been on site. A wrong price that is within twenty percent of reality is caught by nobody until the job is half built." },
      { type: "callout", tone: "warning", title: "The rule we build to", text: "The model may suggest scope. The platform calculates money. No exceptions, no clever middle ground." },
      { type: "h2", text: "Where models genuinely help" },
      {
        type: "ul",
        items: [
          "Recall. Roofing sheets without roofing labour, tiles without waste, an estimate with no transport line  these omissions are patterns, and pattern recall is exactly what these systems do well.",
          "Drafting scope. Turning “20 metre wall, 2.4 high, plastered and painted both sides” into a structured list of trades and quantities saves a real half hour.",
          "Language. Turning your shorthand into a description a client can read without turning it into marketing copy.",
          "Comparison. Flagging that this quotation sits below the margin you normally achieve on this type of work."
        ]
      },
      { type: "h2", text: "Where they must be kept out" },
      {
        type: "ul",
        items: [
          "Rates. Every price comes from your price book, your supplier, or it is left blank and shown to you as blank.",
          "Arithmetic. Quantities, waste, markup, overhead, tax and totals are computed in code that can be unit-tested, not generated as text.",
          "Silent edits. Nothing enters an estimate without a person accepting it.",
          "Cross-company inference. Your rates are not training material for someone else’s quotation."
        ]
      },
      { type: "h2", text: "What that looks like in practice" },
      { type: "p", text: "You describe a job. You get back a scope with quantities, each line mapped to a material in your own price book with the source shown. Lines that could not be matched arrive unpriced and clearly marked, because an honest blank is more useful than a confident invention. You review, adjust, accept  and only then does the calculation engine produce a number." },
      { type: "p", text: "The result is less magical than the demonstrations you have seen, and considerably more useful: an estimate that is fast to produce and that you can defend line by line when the client asks how you arrived at it." },
      { type: "quote", text: "I do not need software that guesses what a building costs. I need software that stops me forgetting the crane.", cite: "A contractor in Tema, during an early product interview" }
    ]
  }
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug) ?? null;
}

export function relatedPosts(slug: string, limit = 3) {
  const post = getPost(slug);
  if (!post) return [];
  return [...POSTS.filter((p) => p.slug !== slug)]
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, limit);
}
