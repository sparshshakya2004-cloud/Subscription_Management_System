import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_invoice_pdf(invoice_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    story = []

    # Title Banner
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=6
    )
    story.append(Paragraph("BRIGHTLOOP SOFTWARE", title_style))

    sub_title = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=20
    )
    story.append(Paragraph("Enterprise Cloud & SaaS Billing System | Tax Invoice", sub_title))
    story.append(Spacer(1, 15))

    # Meta Info Table
    meta_data = [
        [
            Paragraph(f"<b>Billed To:</b><br/>{invoice_data.get('customer_name')}<br/>{invoice_data.get('customer_address') or 'N/A'}<br/>Email: {invoice_data.get('customer_email')}", styles['Normal']),
            Paragraph(f"<b>Invoice #:</b> {invoice_data.get('invoice_number')}<br/><b>Invoice Date:</b> {invoice_data.get('invoice_date')}<br/><b>Due Date:</b> {invoice_data.get('due_date')}<br/><b>Status:</b> {invoice_data.get('status', '').upper()}", styles['Normal'])
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # Items Table
    table_data = [["Item Description", "Qty", "Unit Price (₹)", "Tax (%)", "Total (₹)"]]
    for line in invoice_data.get("lines", []):
        table_data.append([
            line.get("description", "Product"),
            str(line.get("quantity", 1)),
            f"₹{float(line.get('unit_price', 0)):,.2f}",
            f"{float(line.get('tax_rate', 0)):.1f}%",
            f"₹{float(line.get('line_total', 0)):,.2f}"
        ])

    items_table = Table(table_data, colWidths=[240, 50, 90, 60, 100])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Summary Table
    summary_data = [
        ["Subtotal:", f"₹{float(invoice_data.get('subtotal', 0)):,.2f}"],
        ["Tax Amount:", f"₹{float(invoice_data.get('tax_amount', 0)):,.2f}"],
        ["Discount Applied:", f"-₹{float(invoice_data.get('discount_amount', 0)):,.2f}"],
        ["Grand Total:", f"₹{float(invoice_data.get('total_amount', 0)):,.2f}"],
        ["Paid Amount:", f"₹{float(invoice_data.get('paid_amount', 0)):,.2f}"],
        ["Outstanding Balance:", f"₹{float(invoice_data.get('outstanding_amount', 0)):,.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[400, 140])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor("#dc2626") if float(invoice_data.get('outstanding_amount', 0)) > 0 else colors.HexColor("#16a34a")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)

    story.append(Spacer(1, 30))
    story.append(Paragraph("<b>Thank you for choosing Brightloop Software!</b><br/>For electronic wire transfers, please use your unique Invoice # as the reference.", sub_title))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
