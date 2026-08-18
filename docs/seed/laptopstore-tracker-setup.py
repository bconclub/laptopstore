"""
System Updates Laptop Store — tracker sheet builder.

Builds the four-tab QC / system-updates tracker used by the auto-build skill:
  Summary | Tracker | Deliverables | Assets

Safe to re-run: run() REFUSES to touch a Tracker that already has logged rows.
update_summary() is safe any time.

Usage:
    python docs/seed/laptopstore-tracker-setup.py <sheet-url-or-id>
    python docs/seed/laptopstore-tracker-setup.py <sheet-url-or-id> summary

The sheet must already exist and be shared with the service account as Editor.
A service account has NO Drive storage quota of its own, so it cannot create the
file: creating it is the user's action, once. After that every read and write
here is direct, no browser involved.

Once SHEET_ID below is filled in, the argument can be omitted.

Auth: service account key at C:\\Users\\user\\.secrets\\gsheets-sa.json
      (claude-sheets@bconclub-smpt.iam.gserviceaccount.com)
"""

import re
import sys
import json

import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build as gbuild

KEY = r"C:\Users\user\.secrets\gsheets-sa.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]

TITLE = "System Updates Laptop Store"
SHEET_ID = ""          # filled in once the sheet exists
SHARE_WITH = "bconclubx@gmail.com"
PREFIX = "LS"
TRACKER_IDS = 150
ASSET_IDS = 30

# ---------------------------------------------------------------- palette
INK = {"red": 0.06, "green": 0.10, "blue": 0.17}          # #101A2B header fill
WHITE = {"red": 1, "green": 1, "blue": 1}


def hexc(h):
    h = h.lstrip("#")
    return {"red": int(h[0:2], 16) / 255, "green": int(h[2:4], 16) / 255, "blue": int(h[4:6], 16) / 255}


CHIP = {
    # Tracker · Status
    "Open": ("#FADBD8", "#922B21"),
    "In Progress": ("#FDF2CF", "#7D6608"),
    "Fixed": ("#D5F5E3", "#186A3B"),
    "Awaiting Client": ("#FDEBD0", "#9C640C"),
    "Won't Fix": ("#E5E7E9", "#566573"),
    # Tracker · Category
    "Bug": ("#FADBD8", "#922B21"),
    "Correction": ("#FDEBD0", "#9C640C"),
    "Clarification": ("#D6EAF8", "#1A5276"),
    "Findings": ("#E8DAEF", "#5B2C6F"),
    "Thought": ("#EAEDED", "#515A5A"),
    "Feature Request": ("#D5F5E3", "#186A3B"),
    # Tracker · Priority
    "High": ("#FADBD8", "#922B21"),
    "Medium": ("#FDF2CF", "#7D6608"),
    "Low": ("#D5F5E3", "#186A3B"),
    # Deliverables · Status
    "Not Started": ("#E5E7E9", "#566573"),
    "Delivered": ("#D5F5E3", "#186A3B"),
    "On Hold": ("#FDEBD0", "#9C640C"),
    "Dropped": ("#FADBD8", "#922B21"),
    # Deliverables · Source
    "Proposal": ("#D6EAF8", "#1A5276"),
    "Addition": ("#D5F5E3", "#186A3B"),
    "Change Order": ("#FDEBD0", "#9C640C"),
    # Assets · From
    "Client": ("#D6EAF8", "#1A5276"),
    "BCON": ("#E8DAEF", "#5B2C6F"),
}

# ---------------------------------------------------------------- schema
TRACKER_HEADERS = ["ID", "Date", "Reported By", "Section", "Category", "Issue / Finding",
                   "Device", "Priority", "Status", "Fixed In", "Dev Notes", "Resolved"]
TRACKER_WIDTHS = {0: 90, 1: 100, 2: 120, 3: 130, 4: 130, 5: 460,
                  6: 90, 7: 95, 8: 130, 9: 110, 10: 420, 11: 110}

DELIV_HEADERS = ["ID", "Deliverable", "Scope Detail", "Phase", "Source", "Status",
                 "Target Date", "Delivered In", "Delivered Date", "Notes"]
DELIV_WIDTHS = {0: 90, 1: 260, 2: 520, 3: 190, 4: 120, 5: 120,
                6: 115, 7: 110, 8: 120, 9: 300}

ASSET_HEADERS = ["ID", "Asset", "Type", "Link", "From", "Received", "Used In", "Notes"]
ASSET_WIDTHS = {0: 90, 1: 240, 2: 170, 3: 330, 4: 100, 5: 110, 6: 220, 7: 280}

CATEGORIES = ["Bug", "Correction", "Clarification", "Findings", "Thought", "Feature Request"]
DEVICES = ["All", "Desktop", "Mobile", "Tablet"]
PRIORITIES = ["High", "Medium", "Low"]
STATUSES = ["Open", "In Progress", "Fixed", "Awaiting Client", "Won't Fix"]
D_SOURCES = ["Proposal", "Addition", "Change Order"]
D_STATUSES = ["Not Started", "In Progress", "Delivered", "On Hold", "Dropped"]
A_TYPES = ["Logo", "Brand Guide", "Photo", "Video", "Copy / Doc", "Menu / Catalog",
           "Access / Credentials pointer", "Font", "Other"]
A_FROM = ["Client", "BCON"]

PHASES = [
    ("1 · Base", "07-Jul-26", "20-Jul-26"),
    ("2 · Build", "21-Jul-26", "27-Jul-26"),
    ("3 · Products", "28-Jul-26", "10-Aug-26"),
    ("4 · Flow", "11-Aug-26", "24-Aug-26"),
    ("5 · Verify", "25-Aug-26", "07-Sep-26"),
    ("6 · PROXe + Soft launch", "08-Sep-26", "21-Sep-26"),
    ("7 · Launch", "22-Sep-26", "29-Sep-26"),
    ("Parallel track", "07-Jul-26", "ongoing"),
]
PHASE_NAMES = [p[0] for p in PHASES]

# Deliverables extracted from "Laptopstore X BCON.pdf" (Digital Infrastructure
# Proposal, July 2026, 12 weeks) + "Laptopstore security architecture.pdf".
# (deliverable, scope detail, phase, status, target, notes)
NS, IP = "Not Started", "In Progress"
MOCK = "Built against the deterministic mock. Not yet on live Zoho and Postgres."
DELIVERABLES = [
    ("Discovery and requirements capture", "Business lines, stores, audiences and journeys confirmed with the client before build starts.", 0, NS, "20-Jul-26", ""),
    ("Zoho audit", "Full audit of the Zoho product master across all 35 stores: fields, taxonomy, data quality, API access.", 0, NS, "20-Jul-26", ""),
    ("Distributor ingestion decision", "How distributor stock enters the system. Marked as the uncertain one in the proposal, needs a client decision.", 0, NS, "20-Jul-26", "Open decision. Flagged TBD in the proposal."),
    ("Data residency and 2FA policy sign-off", "Database region and two factor policy for admin access confirmed with the client IT team.", 0, NS, "20-Jul-26", "Security architecture doc, section 7."),
    ("System architecture", "Four separated layers: Zoho as system of record, private Postgres, private sync engine, public website.", 1, IP, "27-Jul-26", ""),
    ("Six data models", "New laptops, refurbished, rentals, spares, repair, accessories. Each with its own fields and filters.", 1, IP, "27-Jul-26", MOCK),
    ("Zoho wired", "Webhooks for push and REST polling for pull, so nothing is missed if a webhook fails.", 1, NS, "27-Jul-26", ""),
    ("Master product record schema", "One base record shape, each line stacking its own fields on top. Zoho owns price and stock, the website owns slug, SEO and display copy.", 1, IP, "27-Jul-26", ""),
    ("Row level security rules", "Access enforced per record inside the database, per role, not in website code.", 1, NS, "27-Jul-26", ""),
    ("Sync engine service", "Standalone Node service, three workers: webhook listener, poller, reconciler. Runs on a private always on VPS.", 1, NS, "27-Jul-26", "Holds the master key. Never on the website."),
    ("Queue and cache layer", "Redis or Upstash: holds the job queue, dedupes rapid Zoho updates, buffers rate limits.", 1, NS, "27-Jul-26", ""),
    ("Catalog pipeline", "Extract from Zoho, normalise parents and variants, deduplicate to one master SKU, publish the master catalog.", 2, NS, "10-Aug-26", ""),
    ("Master catalog live in staging", "The single clean source the site reads, visible in staging for review.", 2, NS, "10-Aug-26", ""),
    ("Live price and stock per location", "Live figures per outlet, honoured at checkout. Conflict rule: Zoho always wins.", 2, NS, "10-Aug-26", ""),
    ("Nightly reconcile", "Nightly job that re-checks the catalog against Zoho and corrects drift.", 2, NS, "10-Aug-26", ""),
    ("New laptops line", "SKU level. Variants and configurations, brand hubs, live price and stock per location. Filters: brand, processor, RAM, storage, GPU, screen, use case, price band, EMI.", 2, IP, "10-Aug-26", MOCK),
    ("Refurbished line", "Serial level. Each unit unique with grade, photos, price and warranty. Sold exactly once.", 2, IP, "10-Aug-26", MOCK),
    ("Rentals line", "Availability calendar, duration pricing, deposits and returns. Corporate and individual.", 2, IP, "10-Aug-26", MOCK),
    ("Spares line", "Compatibility matrix: part fits model, model finds part. Filters by category, part number, OEM or compatible, condition, stock.", 2, IP, "10-Aug-26", MOCK),
    ("Repair line", "Booking, diagnosis, quote, status and delivery, tracked live. Filters by service type, brand and model, issue, stage, turnaround.", 2, IP, "10-Aug-26", MOCK),
    ("Accessories line", "Cross sold against every other line. Filters by category, brand, compatible with, colour, price.", 2, IP, "10-Aug-26", MOCK),
    ("Distributor network proven", "Outlets and distributors, territories and pincodes, stock source, commission. Map view.", 2, IP, "10-Aug-26", "Ingestion model still open, see the Base phase row."),
    ("Media pipeline", "Product images served optimised from Supabase Storage or CDN, never from Zoho.", 2, NS, "10-Aug-26", ""),
    ("B2C journey", "Retail pricing, EMI options, pickup or delivery, single unit checkout, repair booking, exchange, order tracking, wishlist.", 3, IP, "24-Aug-26", MOCK),
    ("B2B journey", "Bulk ordering, quantity break pricing, quote requests, GST invoicing, account and order history, AMC and rental contracts.", 3, IP, "24-Aug-26", MOCK),
    ("Purchase checkout", "Pincode routes against stock. Local node gives pickup or delivery, no local node delivers from the nearest stocking source, multi source cart splits into one order with multiple dispatches, trade in credit applied to cart.", 3, IP, "24-Aug-26", MOCK),
    ("Repair checkout", "Pincode finds the nearest service capable node. Drop off, pickup or on site. Books a job slot, not a stock item. Advance or pay on diagnosis.", 3, IP, "24-Aug-26", MOCK),
    ("Rental checkout", "Routes to a node with the unit free for the dates. Availability calendar confirms, deposit and agreement taken at checkout, return node set upfront.", 3, IP, "24-Aug-26", MOCK),
    ("Enquiry checkout", "No instant payment. Routes to the right desk, requirement captured, quote issued, order confirmed offline, converted to a purchase or rental order.", 3, IP, "24-Aug-26", MOCK),
    ("Four state machines", "Purchase, enquiry, repair and rental flows end to end. Every one writes into Zoho.", 3, IP, "24-Aug-26", MOCK),
    ("Admin panel", "Catalog, Network, Orders, Enquiries, Users and roles, Zoho sync health. One screen where the business is run.", 3, IP, "24-Aug-26", MOCK),
    ("Analytics and reporting", "Revenue by node, line and source, conversion, response times, repair turnaround, rental utilisation, refurb sell through, distributor league table.", 3, IP, "24-Aug-26", MOCK),
    ("Authentication and roles", "Session management, password policy, two factor for admin. Six roles: HQ, outlet manager, distributor, repair desk, B2B desk, customer.", 3, IP, "24-Aug-26", ""),
    ("Audit trail", "Administrative actions logged: who changed what and when, kept as a traceable history.", 3, NS, "24-Aug-26", ""),
    ("Catalog signed off", "Client confirms the catalog is correct and complete before launch.", 4, NS, "07-Sep-26", ""),
    ("Numbers trustworthy", "Price and stock parity against Zoho verified across lines and locations.", 4, NS, "07-Sep-26", ""),
    ("Backup and recovery verified", "Automated daily backups and point in time recovery tested, not just enabled.", 4, NS, "07-Sep-26", ""),
    ("Security configuration verified", "Master key isolated to the sync engine, row level rules on for every table, keys in a vault and rotatable.", 4, NS, "07-Sep-26", "Closes both failure modes named in the security doc."),
    ("PROXe conversation layer", "HQ only. WhatsApp, Instagram DM, Messenger, Facebook, email and web chat in one place. Voice later.", 5, NS, "21-Sep-26", ""),
    ("PROXe reads the live catalog", "Answers stock, price and availability from the same database the site reads. Escalates a real buyer to HQ mid thread. Every conversation and lead logged to Zoho.", 5, NS, "21-Sep-26", ""),
    ("Soft launch", "Live to a limited audience, watched before the full cutover.", 5, NS, "21-Sep-26", ""),
    ("DNS and domain cutover", "laptopstoreindia.com moved to the new site.", 6, NS, "29-Sep-26", ""),
    ("Go live", "Full public launch.", 6, NS, "29-Sep-26", "Go live by 29 Sep 2026 per the proposal."),
    ("Handover", "Code and database handed over with full documentation so any developer can operate the system.", 6, NS, "29-Sep-26", ""),
    ("WhatsApp BSP approval", "Meta runs this clock, two to three weeks, and can reject. Started in week 1 so it never becomes the blocker.", 7, NS, "ongoing", "External clock. Not ours to control."),
    ("Zoho API sandbox access", "Sandbox access and rate limits confirmed.", 7, NS, "ongoing", "External. Needs client Zoho admin."),
    ("DNS and domain control", "Registrar and DNS control secured before cutover week.", 7, NS, "ongoing", "External. Needs client access."),
]

# (asset, type, link, from, received, used in, notes)
ASSETS = [
    ("Primary logo", "Logo", "", "Client", "", "Header, footer, favicon", "Have a JPG icon locally. Needs an SVG or transparent PNG plus a durable link."),
    ("Brand guide", "Brand Guide", "", "Client", "", "Design system", "Not received. Design tokens currently derived from the live site."),
    ("Category images", "Photo", "", "BCON", "", "Category pages", "Local set exists. Needs a Drive folder link."),
    ("Banners, desktop", "Photo", "", "BCON", "", "Home hero and promo panels", "Local set exists. Needs a Drive folder link."),
    ("Banners, mobile", "Photo", "", "BCON", "", "Home hero, mobile", "Local set exists. Needs a Drive folder link."),
    ("Product photography", "Photo", "", "Client", "", "Product pages", "Needed per SKU and per refurbished serial. Bulk source not yet agreed."),
    ("Store and outlet list", "Copy / Doc", "", "Client", "", "Network map, pincode routing", "35 outlets plus distributors, with addresses and pincodes."),
    ("Zoho API credentials pointer", "Access / Credentials pointer", "", "Client", "", "Sync engine", "Pointer only. Never put the key in this sheet."),
    ("WhatsApp BSP account", "Access / Credentials pointer", "", "Client", "", "PROXe", "Meta approval runs two to three weeks."),
    ("Domain and DNS access", "Access / Credentials pointer", "", "Client", "", "Cutover", "Needed before launch week."),
    ("GST invoice template", "Copy / Doc", "", "Client", "", "B2B invoicing", "Sample invoice held locally, needs the official template."),
    ("Payment terms", "Copy / Doc", "", "Client", "", "Checkout, B2B terms", "Held locally, needs a durable link."),
    ("Proposal", "Copy / Doc", "", "BCON", "18-Jul-26", "Deliverables tab", "This sheet's Deliverables tab is built from it."),
    ("Security architecture doc", "Copy / Doc", "", "BCON", "19-Jul-26", "Client IT review", "Five pages, confidential."),
]


# ---------------------------------------------------------------- helpers
def a1(col):
    s = ""
    col += 1
    while col:
        col, r = divmod(col - 1, 26)
        s = chr(65 + r) + s
    return s


def creds():
    return Credentials.from_service_account_file(KEY, scopes=SCOPES)


def sheet_id_from(arg):
    if not arg:
        return ""
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", arg)
    return m.group(1) if m else arg.strip()


def open_sheet(gc, drive, want):
    """Open the target sheet. A service account cannot create one (no Drive
    quota), so the sheet must exist and be shared with it as Editor."""
    sid = sheet_id_from(want) or SHEET_ID
    if not sid:
        res = drive.files().list(
            q=("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false "
               f"and name='{TITLE}'"),
            fields="files(id,name)", pageSize=10).execute()
        files = res.get("files", [])
        if not files:
            sys.exit(
                "No sheet to build into.\n"
                f"Create a blank Google Sheet named '{TITLE}', share it with\n"
                f"  {json.load(open(KEY))['client_email']}  as Editor,\n"
                "then re-run with the link:\n"
                "  python docs/seed/laptopstore-tracker-setup.py <sheet-url>")
        sid = files[0]["id"]
    sh = gc.open_by_key(sid)
    print(f"opened: {sh.title} ({sid})")
    return sh, False


# ---------------------------------------------------------------- format ops
def header_fmt(sid, ncols):
    return [
        {"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1,
                      "startColumnIndex": 0, "endColumnIndex": ncols},
            "cell": {"userEnteredFormat": {
                "backgroundColor": INK,
                "textFormat": {"bold": True, "foregroundColor": WHITE, "fontSize": 10},
                "verticalAlignment": "MIDDLE",
                "horizontalAlignment": "LEFT",
                "padding": {"left": 8, "right": 8},
            }},
            "fields": "userEnteredFormat"}},
        {"updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"}},
        {"updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 38}, "fields": "pixelSize"}},
    ]


def widths(sid, spec):
    return [{"updateDimensionProperties": {
        "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": c, "endIndex": c + 1},
        "properties": {"pixelSize": px}, "fields": "pixelSize"}} for c, px in spec.items()]


def validation(sid, col, values, start_row=1, end_row=1000):
    return {"setDataValidation": {
        "range": {"sheetId": sid, "startRowIndex": start_row, "endRowIndex": end_row,
                  "startColumnIndex": col, "endColumnIndex": col + 1},
        "rule": {"condition": {"type": "ONE_OF_LIST",
                               "values": [{"userEnteredValue": v} for v in values]},
                 "showCustomUi": True, "strict": False}}}


def chips(sid, col, values, start_row=1, end_row=1000):
    out = []
    for v in values:
        bg, fg = CHIP[v]
        out.append({"addConditionalFormatRule": {"rule": {
            "ranges": [{"sheetId": sid, "startRowIndex": start_row, "endRowIndex": end_row,
                        "startColumnIndex": col, "endColumnIndex": col + 1}],
            "booleanRule": {
                "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": v}]},
                "format": {"backgroundColor": hexc(bg),
                           "textFormat": {"foregroundColor": hexc(fg), "bold": True}}}},
            "index": 0}})
    return out


def wrap(sid, cols, ncols, rows=1000):
    out = [{"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": rows,
                  "startColumnIndex": 0, "endColumnIndex": ncols},
        "cell": {"userEnteredFormat": {"verticalAlignment": "TOP",
                                       "wrapStrategy": "CLIP",
                                       "textFormat": {"fontSize": 10}}},
        "fields": "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)"}}]
    for c in cols:
        out.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": rows,
                      "startColumnIndex": c, "endColumnIndex": c + 1},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP"}},
            "fields": "userEnteredFormat.wrapStrategy"}})
    return out


def reset_sheet(meta_sheet, sid, ncols, rows=1000):
    """Wipe formatting left behind by an earlier build: conditional format rules,
    data validations, number formats, banding. gspread's clear() only removes
    values, so without this a rebuild inherits stale percent formats and
    validations that now sit under different columns."""
    full = {"sheetId": sid, "startRowIndex": 0, "endRowIndex": rows,
            "startColumnIndex": 0, "endColumnIndex": ncols}
    ops = []
    # delete existing conditional format rules, highest index first
    n_cf = len(meta_sheet.get("conditionalFormats", []))
    for i in range(n_cf - 1, -1, -1):
        ops.append({"deleteConditionalFormatRule": {"sheetId": sid, "index": i}})
    # drop existing banded ranges
    for b in meta_sheet.get("bandedRanges", []):
        ops.append({"deleteBanding": {"bandedRangeId": b["bandedRangeId"]}})
    # clear validations, then reset every cell format to default
    ops.append({"setDataValidation": {"range": full}})
    ops.append({"repeatCell": {"range": full, "cell": {}, "fields": "userEnteredFormat"}})
    return ops


def banding(sid, ncols, rows=1000):
    return [{"addBanding": {"bandedRange": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": rows,
                  "startColumnIndex": 0, "endColumnIndex": ncols},
        "rowProperties": {"firstBandColor": {"red": 1, "green": 1, "blue": 1},
                          "secondBandColor": hexc("#F5F7F9")}}}}]


# ---------------------------------------------------------------- summary
def summary_rows():
    """Returns (values, merges_spec) for the Summary tab. Data rows start at
    Tracker row 3 / Deliverables row 3 because row 2 of each is an example."""
    t_issue = "Tracker!F3:F"
    d_name = "Deliverables!B3:B"
    r = []
    r.append(["Laptop Store India"])
    r.append(["System updates, QC and scope tracker · built by BCON Club"])
    r.append([f"Log anything you find on the Tracker tab. Scope lives on Deliverables. "
              f"Shared files live on Assets. Row 2 of Tracker and Assets is a filled-in example, "
              f"overwrite or delete it."])
    r.append([])
    r.append(["ISSUES CLOSED"])
    r.append([f'=IFERROR(COUNTIF(Tracker!I3:I,"Fixed")/COUNTA({t_issue}),0)'])
    r.append([])
    r.append(["STATUS", "", "COUNT", "SHARE"])
    first_status = len(r) + 1
    for s in STATUSES:
        r.append([s, "", f'=COUNTIF(Tracker!I3:I,"{s}")', ""])
    total_status = len(r) + 1
    r.append(["Total", "", f"=COUNTA({t_issue})", ""])
    for i, _ in enumerate(STATUSES):
        r[first_status - 1 + i][3] = f"=IFERROR(C{first_status + i}/$C${total_status},0)"
    r.append([])
    r.append(["PRIORITY", "", "COUNT", "SHARE"])
    first_pri = len(r) + 1
    for p in PRIORITIES:
        r.append([p, "", f'=COUNTIF(Tracker!H3:H,"{p}")', ""])
    total_pri = len(r) + 1
    r.append(["Total", "", f"=COUNTA({t_issue})", ""])
    for i, _ in enumerate(PRIORITIES):
        r[first_pri - 1 + i][3] = f"=IFERROR(C{first_pri + i}/$C${total_pri},0)"
    r.append([])
    r.append(["DELIVERABLES SHIPPED"])
    r.append([f'=IFERROR(COUNTIF(Deliverables!F3:F,"Delivered")/COUNTA({d_name}),0)'])
    r.append([])
    r.append(["DELIVERABLE STATUS", "", "COUNT", "SHARE"])
    first_d = len(r) + 1
    for s in D_STATUSES:
        r.append([s, "", f'=COUNTIF(Deliverables!F3:F,"{s}")', ""])
    total_d = len(r) + 1
    r.append(["Total", "", f"=COUNTA({d_name})", ""])
    for i, _ in enumerate(D_STATUSES):
        r[first_d - 1 + i][3] = f"=IFERROR(C{first_d + i}/$C${total_d},0)"
    r.append([])
    r.append(["PHASE", "WINDOW", "COUNT", "DELIVERED"])
    first_p = len(r) + 1
    for name, start, end in PHASES:
        win = "from 07-Jul-26" if end == "ongoing" else f"{start} to {end}"
        r.append([name, win, f'=COUNTIF(Deliverables!D3:D,"{name}")',
                  f'=COUNTIFS(Deliverables!D3:D,"{name}",Deliverables!F3:F,"Delivered")'])
    last_p = len(r)
    r.append([])
    r.append(["Timeline: started 07-Jul-2026 · 12 weeks · go live by 29-Sep-2026."])
    r.append(["This tab is all formulas. It updates itself as the other tabs are filled in."])
    # SECTION goes last: sections are free text, so the list grows, and only the
    # bottom of the tab gives it unlimited room to spill without hitting a #REF!
    r.append([])
    r.append(["SECTION", "", "COUNT", "SHARE"])
    sec_row = len(r) + 1
    span = f"A{sec_row}:A{sec_row + 200}"
    r.append([f'=IFERROR(SORT(UNIQUE(FILTER(Tracker!D3:D,Tracker!D3:D<>""))),"")', "",
              f'=IFERROR(ARRAYFORMULA(IF({span}="","",COUNTIF(Tracker!D3:D,{span}))),"")',
              f'=IFERROR(ARRAYFORMULA(IF({span}="","",'
              f'COUNTIF(Tracker!D3:D,{span})/COUNTA({t_issue}))),"")'])
    r = [(row + [""] * 4)[:4] for row in r]  # pad ragged rows, gspread needs a rectangle
    return r, {
        "first_status": first_status, "total_status": total_status,
        "first_pri": first_pri, "total_pri": total_pri,
        "sec_row": sec_row, "first_d": first_d, "total_d": total_d,
        "first_p": first_p, "last_p": last_p,
    }


def _find(rows, label):
    for i, row in enumerate(rows, 1):
        if row and row[0] == label:
            return i
    return 0


def summary_format(sid, rows, meta):
    d_head = _find(rows, "DELIVERABLES SHIPPED")
    ops = [
        {"updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"hideGridlines": True}},
            "fields": "gridProperties.hideGridlines"}},
        {"updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 260}, "fields": "pixelSize"}},
        {"updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2},
            "properties": {"pixelSize": 210}, "fields": "pixelSize"}},
        {"updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 4},
            "properties": {"pixelSize": 110}, "fields": "pixelSize"}},
        # brand name
        {"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1,
                      "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {
                "bold": True, "fontSize": 20, "foregroundColor": hexc("#101A2B")}}},
            "fields": "userEnteredFormat.textFormat"}},
        {"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 3,
                      "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {
                "fontSize": 10, "foregroundColor": hexc("#5D6D7E")}}},
            "fields": "userEnteredFormat.textFormat"}},
    ]
    # the two big percentage numbers
    for head, num in ((5, 6), (d_head, d_head + 1)):
        ops.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": head - 1, "endRowIndex": head,
                      "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {
                "bold": True, "fontSize": 9, "foregroundColor": hexc("#8A97A5")}}},
            "fields": "userEnteredFormat.textFormat"}})
        ops.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": num - 1, "endRowIndex": num,
                      "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {
                "numberFormat": {"type": "NUMBER", "pattern": "0.0%"},
                "horizontalAlignment": "LEFT",
                "textFormat": {"bold": True, "fontSize": 28,
                               "foregroundColor": hexc("#186A3B")}}},
            "fields": "userEnteredFormat(numberFormat,horizontalAlignment,textFormat)"}})
    # table headers
    for label in ("STATUS", "PRIORITY", "SECTION", "DELIVERABLE STATUS", "PHASE"):
        rw = _find(rows, label)
        ops.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": rw - 1, "endRowIndex": rw,
                      "startColumnIndex": 0, "endColumnIndex": 4},
            "cell": {"userEnteredFormat": {
                "backgroundColor": hexc("#EAEDF0"),
                "textFormat": {"bold": True, "fontSize": 9,
                               "foregroundColor": hexc("#101A2B")}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
    # share columns as percent
    for start, end in ((meta["first_status"], meta["total_status"]),
                       (meta["first_pri"], meta["total_pri"]),
                       (meta["sec_row"], meta["sec_row"] + 200),
                       (meta["first_d"], meta["total_d"])):
        ops.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": start - 1, "endRowIndex": end,
                      "startColumnIndex": 3, "endColumnIndex": 4},
            "cell": {"userEnteredFormat": {
                "numberFormat": {"type": "NUMBER", "pattern": "0.0%"}}},
            "fields": "userEnteredFormat.numberFormat"}})
    # bold totals
    for rw in (meta["total_status"], meta["total_pri"], meta["total_d"]):
        ops.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": rw - 1, "endRowIndex": rw,
                      "startColumnIndex": 0, "endColumnIndex": 4},
            "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
            "fields": "userEnteredFormat.textFormat"}})
    # phase window column, small grey
    ops.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": meta["first_p"] - 1,
                  "endRowIndex": meta["last_p"], "startColumnIndex": 1, "endColumnIndex": 2},
        "cell": {"userEnteredFormat": {"textFormat": {
            "fontSize": 9, "foregroundColor": hexc("#5D6D7E")}}},
        "fields": "userEnteredFormat.textFormat"}})
    note = _find(rows, "Timeline: started 07-Jul-2026 · 12 weeks · go live by 29-Sep-2026.")
    ops.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": note - 1, "endRowIndex": note + 1,
                  "startColumnIndex": 0, "endColumnIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {
            "fontSize": 9, "italic": True, "foregroundColor": hexc("#8A97A5")}}},
        "fields": "userEnteredFormat.textFormat"}})
    return ops


# ---------------------------------------------------------------- build
def run(target="", summary_only=False):
    c = creds()
    gc = gspread.authorize(c)
    drive = gbuild("drive", "v3", credentials=c)
    api = gbuild("sheets", "v4", credentials=c)

    sh, fresh = open_sheet(gc, drive, target)
    if sh.title != TITLE:
        try:
            sh.update_title(TITLE)
            print(f"renamed to: {TITLE}")
        except Exception as e:
            print("rename skipped:", e)

    # ---- guard: never wipe a tracker that has real rows
    if not summary_only and not fresh:
        try:
            tr = sh.worksheet("Tracker")
            logged = [v for v in tr.col_values(6)[2:] if v.strip()]
            if logged:
                print(f"REFUSING to rebuild: Tracker has {len(logged)} logged issue(s). "
                      f"Run with 'summary' to refresh the Summary tab only.")
                return
        except gspread.WorksheetNotFound:
            pass

    # ---- tabs
    existing = {ws.title: ws for ws in sh.worksheets()}
    if "Sheet1" in existing and "Tracker" not in existing:
        existing["Sheet1"].update_title("Tracker")
        existing["Tracker"] = existing.pop("Sheet1")
    for name, cols in (("Summary", 8), ("Tracker", 12), ("Deliverables", 10), ("Assets", 8)):
        if name not in existing:
            existing[name] = sh.add_worksheet(name, rows=1000, cols=cols)
    order = ["Summary", "Tracker", "Deliverables", "Assets"]
    ws = {n: existing[n] for n in order}
    sid = {n: ws[n].id for n in order}

    # current formatting state, needed to clear what a previous build left behind
    info = api.spreadsheets().get(
        spreadsheetId=sh.id,
        fields="sheets(properties(sheetId,title),conditionalFormats,bandedRanges(bandedRangeId))"
    ).execute()
    meta_by_id = {s["properties"]["sheetId"]: s for s in info["sheets"]}
    ncols_by_name = {"Summary": 8, "Tracker": 12, "Deliverables": 10, "Assets": 8}

    if summary_only:
        rows, meta = summary_rows()
        ws["Summary"].clear()
        ws["Summary"].update(rows, "A1", value_input_option="USER_ENTERED")
        api.spreadsheets().batchUpdate(spreadsheetId=sh.id, body={"requests":
            reset_sheet(meta_by_id[sid["Summary"]], sid["Summary"], 8)
            + summary_format(sid["Summary"], rows, meta)}).execute()
        print("summary rebuilt")
        return

    reqs = []
    for n in order:
        reqs += reset_sheet(meta_by_id[sid[n]], sid[n], ncols_by_name[n])
    for i, n in enumerate(order):
        reqs.append({"updateSheetProperties": {
            "properties": {"sheetId": sid[n], "index": i}, "fields": "index"}})

    # ---- Tracker values
    t_vals = [TRACKER_HEADERS]
    t_vals.append([f"{PREFIX}-EG", "11-08-2026", "Example row", "Website",
                   "Bug", "EXAMPLE, delete or type over this row. Describe what you saw, "
                          "where you saw it and what you expected instead.",
                   "Mobile", "High", "Open", "", "Dev fills this in. Cause, what changed, "
                                                 "how it was checked.", ""])
    for i in range(1, TRACKER_IDS + 1):
        t_vals.append([f"{PREFIX}-{i}"])
    ws["Tracker"].clear()
    ws["Tracker"].update(t_vals, "A1", value_input_option="USER_ENTERED")

    reqs += header_fmt(sid["Tracker"], 12)
    reqs += widths(sid["Tracker"], TRACKER_WIDTHS)
    reqs += wrap(sid["Tracker"], [5, 10], 12)
    reqs += banding(sid["Tracker"], 12)
    reqs.append(validation(sid["Tracker"], 4, CATEGORIES))
    reqs.append(validation(sid["Tracker"], 6, DEVICES))
    reqs.append(validation(sid["Tracker"], 7, PRIORITIES))
    reqs.append(validation(sid["Tracker"], 8, STATUSES))
    reqs += chips(sid["Tracker"], 4, CATEGORIES)
    reqs += chips(sid["Tracker"], 7, PRIORITIES)
    reqs += chips(sid["Tracker"], 8, STATUSES)
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Tracker"], "startRowIndex": 1, "endRowIndex": 1000,
                  "startColumnIndex": 1, "endColumnIndex": 2},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "DATE", "pattern": "dd-mm-yyyy"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Tracker"], "startRowIndex": 1, "endRowIndex": 1000,
                  "startColumnIndex": 11, "endColumnIndex": 12},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "DATE", "pattern": "dd-mmm-yy"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    # grey out the example row
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Tracker"], "startRowIndex": 1, "endRowIndex": 2,
                  "startColumnIndex": 0, "endColumnIndex": 12},
        "cell": {"userEnteredFormat": {"textFormat": {
            "italic": True, "foregroundColor": hexc("#7F8C8D")}}},
        "fields": "userEnteredFormat.textFormat"}})

    # ---- Deliverables values
    d_vals = [DELIV_HEADERS]
    d_vals.append([f"{PREFIX}-DEG", "EXAMPLE row", "This is what a deliverable looks like. "
                                                   "The rows below are the real scope, taken from the proposal.",
                   PHASE_NAMES[0], "Proposal", "Delivered", "20-Jul-26", "v0.1.0", "20-Jul-26",
                   "Delete or type over this row."])
    for i, (name, detail, ph, status, target, note) in enumerate(DELIVERABLES, 1):
        d_vals.append([f"{PREFIX}-D{i}", name, detail, PHASE_NAMES[ph], "Proposal",
                       status, target, "", "", note])
    for i in range(len(DELIVERABLES) + 1, len(DELIVERABLES) + 21):
        d_vals.append([f"{PREFIX}-D{i}"])
    ws["Deliverables"].clear()
    ws["Deliverables"].update(d_vals, "A1", value_input_option="USER_ENTERED")

    reqs += header_fmt(sid["Deliverables"], 10)
    reqs += widths(sid["Deliverables"], DELIV_WIDTHS)
    reqs += wrap(sid["Deliverables"], [1, 2, 9], 10)
    reqs += banding(sid["Deliverables"], 10)
    reqs.append(validation(sid["Deliverables"], 3, PHASE_NAMES))
    reqs.append(validation(sid["Deliverables"], 4, D_SOURCES))
    reqs.append(validation(sid["Deliverables"], 5, D_STATUSES))
    reqs += chips(sid["Deliverables"], 4, D_SOURCES)
    reqs += chips(sid["Deliverables"], 5, D_STATUSES)
    for col in (6, 8):  # Target Date, Delivered Date
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid["Deliverables"], "startRowIndex": 1, "endRowIndex": 1000,
                      "startColumnIndex": col, "endColumnIndex": col + 1},
            "cell": {"userEnteredFormat": {
                "numberFormat": {"type": "DATE", "pattern": "dd-mmm-yy"}}},
            "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Assets"], "startRowIndex": 1, "endRowIndex": 1000,
                  "startColumnIndex": 5, "endColumnIndex": 6},
        "cell": {"userEnteredFormat": {
            "numberFormat": {"type": "DATE", "pattern": "dd-mmm-yy"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Deliverables"], "startRowIndex": 1, "endRowIndex": 2,
                  "startColumnIndex": 0, "endColumnIndex": 10},
        "cell": {"userEnteredFormat": {"textFormat": {
            "italic": True, "foregroundColor": hexc("#7F8C8D")}}},
        "fields": "userEnteredFormat.textFormat"}})

    # ---- Assets values
    a_vals = [ASSET_HEADERS]
    a_vals.append([f"{PREFIX}-AEG", "EXAMPLE, primary logo SVG", "Logo",
                   "https://drive.google.com/your-link-here", "Client", "11-Aug-26",
                   "Header and favicon", "EXAMPLE row. One asset, one row, one link. "
                                         "Never put passwords or API keys in this sheet."])
    for i, (name, typ, link, frm, recv, used, note) in enumerate(ASSETS, 1):
        a_vals.append([f"{PREFIX}-A{i}", name, typ, link, frm, recv, used, note])
    for i in range(len(ASSETS) + 1, ASSET_IDS + 1):
        a_vals.append([f"{PREFIX}-A{i}"])
    ws["Assets"].clear()
    ws["Assets"].update(a_vals, "A1", value_input_option="USER_ENTERED")

    reqs += header_fmt(sid["Assets"], 8)
    reqs += widths(sid["Assets"], ASSET_WIDTHS)
    reqs += wrap(sid["Assets"], [1, 6, 7], 8)
    reqs += banding(sid["Assets"], 8)
    reqs.append(validation(sid["Assets"], 2, A_TYPES))
    reqs.append(validation(sid["Assets"], 4, A_FROM))
    reqs += chips(sid["Assets"], 4, A_FROM)
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid["Assets"], "startRowIndex": 1, "endRowIndex": 2,
                  "startColumnIndex": 0, "endColumnIndex": 8},
        "cell": {"userEnteredFormat": {"textFormat": {
            "italic": True, "foregroundColor": hexc("#7F8C8D")}}},
        "fields": "userEnteredFormat.textFormat"}})

    # ---- Summary
    rows, meta = summary_rows()
    ws["Summary"].clear()
    ws["Summary"].update(rows, "A1", value_input_option="USER_ENTERED")
    reqs += summary_format(sid["Summary"], rows, meta)

    api.spreadsheets().batchUpdate(spreadsheetId=sh.id, body={"requests": reqs}).execute()

    print("\nURL:", f"https://docs.google.com/spreadsheets/d/{sh.id}/edit")
    print("gids:", json.dumps({n: sid[n] for n in order}))
    print(f"deliverables: {len(DELIVERABLES)} · assets: {len(ASSETS)}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    only = "summary" in args
    tgt = next((a for a in args if a != "summary"), "")
    run(target=tgt, summary_only=only)
