/** Professional starter designs for Unlayer (`react-email-editor` loadDesign). */

type UnlayerDesign = Record<string, unknown>

function meta(id: string, className: string) {
  return { htmlID: id, htmlClassNames: className }
}

function textBlock(
  id: string,
  text: string,
  opts?: { fontSize?: string; color?: string; align?: string; fontWeight?: string },
) {
  return {
    id,
    type: 'text',
    values: {
      containerPadding: '10px 20px',
      anchor: '',
      textAlign: opts?.align ?? 'left',
      lineHeight: '170%',
      linkStyle: {
        inherit: true,
        linkColor: '#0f766e',
        linkHoverColor: '#0d9488',
        linkUnderline: true,
        linkHoverUnderline: true,
      },
      hideDesktop: false,
      displayCondition: null,
      _meta: meta(id, 'u_content_text'),
      text: text,
      _styleGuide: null,
    },
  }
}

function headingBlock(id: string, text: string, opts?: { align?: string; color?: string; size?: string }) {
  return {
    id,
    type: 'heading',
    values: {
      containerPadding: '12px 20px',
      anchor: '',
      headingType: 'h1',
      fontWeight: 700,
      fontSize: opts?.size ?? '26px',
      textAlign: opts?.align ?? 'left',
      lineHeight: '140%',
      linkStyle: { inherit: true },
      hideDesktop: false,
      displayCondition: null,
      _meta: meta(id, 'u_content_heading'),
      text,
      color: opts?.color ?? '#0f172a',
      _styleGuide: null,
    },
  }
}

function buttonBlock(id: string, label: string, url = '#') {
  return {
    id,
    type: 'button',
    values: {
      href: { name: 'web', values: { href: url, target: '_blank' } },
      buttonColors: {
        color: '#ffffff',
        backgroundColor: '#0f766e',
        hoverColor: '#ffffff',
        hoverBackgroundColor: '#0d9488',
      },
      size: { autoWidth: true, width: '100%' },
      fontSize: '15px',
      fontWeight: 600,
      lineHeight: '120%',
      textAlign: 'center',
      padding: '14px 28px',
      border: {},
      borderRadius: '8px',
      containerPadding: '16px 20px',
      _meta: meta(id, 'u_content_button'),
      text: label,
      _styleGuide: null,
    },
  }
}

function dividerBlock(id: string) {
  return {
    id,
    type: 'divider',
    values: {
      width: '100%',
      border: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e2e8f0' },
      textAlign: 'center',
      containerPadding: '10px 20px',
      _meta: meta(id, 'u_content_divider'),
      _styleGuide: null,
    },
  }
}

function htmlBlock(id: string, html: string) {
  return {
    id,
    type: 'html',
    values: {
      html,
      hideDesktop: false,
      displayCondition: null,
      containerPadding: '10px 20px',
      _meta: meta(id, 'u_content_html'),
      _styleGuide: null,
    },
  }
}

function column(id: string, contents: unknown[]) {
  return {
    id,
    contents,
    values: {
      backgroundColor: '',
      padding: '0px',
      border: {},
      borderRadius: '0px',
      _meta: meta(id, 'u_column'),
    },
  }
}

function row(id: string, columns: unknown[], backgroundColor = '#ffffff') {
  return {
    id,
    cells: columns.map(() => 1),
    columns,
    values: {
      backgroundColor,
      columnsBackgroundColor: backgroundColor,
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      hideDesktop: false,
      displayCondition: null,
      columns: columns.length === 2 ? false : false,
      _meta: meta(id, 'u_row'),
      _styleGuide: null,
    },
  }
}

function design(rows: unknown[], counters: Record<string, number>, preheader = ''): UnlayerDesign {
  return {
    counters,
    body: {
      id: 'u_body',
      rows,
      headers: [],
      footers: [],
      values: {
        popupPosition: 'center',
        popupWidth: '600px',
        popupHeight: 'auto',
        borderRadius: '0px',
        contentAlign: 'center',
        contentVerticalAlign: 'center',
        contentWidth: '600px',
        fontFamily: { label: 'Helvetica', value: 'helvetica,arial,sans-serif' },
        textColor: '#334155',
        popupBackgroundColor: '#FFFFFF',
        popupBackgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'cover', position: 'center' },
        popupOverlay_backgroundColor: 'rgba(0, 0, 0, 0.1)',
        popupCloseButton_position: 'top-right',
        popupCloseButton_backgroundColor: '#DDDDDD',
        popupCloseButton_iconColor: '#000000',
        popupCloseButton_borderRadius: '0px',
        popupCloseButton_margin: '0px',
        popupCloseButton_action: {
          name: 'close_popup',
          attrs: { onClick: "document.querySelector('.u-popup-container').style.display = 'none';" },
        },
        backgroundColor: '#f1f5f9',
        backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
        preheaderText: preheader,
        linkStyle: {
          body: true,
          linkColor: '#0f766e',
          linkHoverColor: '#0d9488',
          linkUnderline: true,
          linkHoverUnderline: true,
        },
        _meta: meta('u_body', 'u_body'),
      },
    },
    schemaVersion: 16,
  }
}

export type UnlayerPreset = {
  key: string
  name: string
  description: string
  category: 'email' | 'document'
  documentType?: 'SALES_INVOICE' | 'QUOTATION'
  subject?: string
  design: UnlayerDesign
}

export const emailPresets: UnlayerPreset[] = [
  {
    key: 'sales-welcome',
    name: 'Sales welcome',
    description: 'Professional nurture welcome for new leads',
    category: 'email',
    subject: 'Welcome {{firstName}} — let’s explore how we can help {{company}}',
    design: design(
      [
        row(
          'u_row_1',
          [
            column('u_column_1', [
              headingBlock('u_content_heading_1', '{{company}}', { color: '#ffffff', size: '18px' }),
              textBlock(
                'u_content_text_1',
                '<p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ccfbf1;">Sales &amp; accounts</p>',
              ),
            ]),
          ],
          '#0f766e',
        ),
        row('u_row_2', [
          column('u_column_2', [
            headingBlock('u_content_heading_2', 'Hello {{firstName}},', { size: '28px' }),
            textBlock(
              'u_content_text_2',
              '<p>Thank you for your interest in partnering with us. We help growing businesses streamline invoicing, inventory, and collections — so your team can focus on closing deals.</p><p>Here’s a quick outline of next steps tailored for <strong>{{company}}</strong>.</p>',
            ),
            htmlBlock(
              'u_content_html_1',
              `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 4px;">
<tr><td style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">What we’ll cover</p>
<ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:1.6;">
<li>Current billing &amp; quotation workflow</li>
<li>GST-ready tax invoices and e-way needs</li>
<li>Receivables follow-ups that stay on-brand</li>
</ul>
</td></tr></table>`,
            ),
            buttonBlock('u_content_button_1', 'Book a discovery call'),
            textBlock(
              'u_content_text_3',
              '<p style="font-size:13px;color:#64748b;">Prefer email? Reply to this message and our sales desk will respond within one business day.</p>',
            ),
          ]),
        ]),
        row(
          'u_row_3',
          [
            column('u_column_3', [
              dividerBlock('u_content_divider_1'),
              textBlock(
                'u_content_text_4',
                '<p style="text-align:center;font-size:12px;color:#94a3b8;margin:0;">© FlowLedger · Professional GST billing for Indian businesses<br/>You received this because you enquired with us · {{email}}</p>',
                { align: 'center' },
              ),
            ]),
          ],
          '#f8fafc',
        ),
      ],
      {
        u_row: 3,
        u_column: 3,
        u_content_text: 4,
        u_content_heading: 2,
        u_content_button: 1,
        u_content_divider: 1,
        u_content_html: 1,
      },
      'Welcome from our sales team',
    ),
  },
  {
    key: 'quotation-followup',
    name: 'Quotation follow-up',
    description: 'Polished follow-up after sending a quotation',
    category: 'email',
    subject: 'Your quotation for {{company}} is ready — {{firstName}}',
    design: design(
      [
        row(
          'u_row_1',
          [
            column('u_column_1', [
              textBlock(
                'u_content_text_1',
                '<p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">Quotation ready</p>',
                { align: 'center', color: '#ffffff' },
              ),
              headingBlock('u_content_heading_1', 'We’ve prepared your proposal', {
                align: 'center',
                color: '#ffffff',
                size: '26px',
              }),
            ]),
          ],
          '#0f172a',
        ),
        row('u_row_2', [
          column('u_column_2', [
            textBlock(
              'u_content_text_2',
              '<p>Hi {{firstName}},</p><p>Please find the quotation prepared for <strong>{{company}}</strong>. Pricing is valid for 15 days and includes applicable GST as itemised in the document.</p>',
            ),
            htmlBlock(
              'u_content_html_1',
              `<table width="100%" style="border-collapse:collapse;font-size:14px;">
<tr>
<td style="padding:14px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
<p style="margin:0 0 4px;font-size:12px;color:#047857;text-transform:uppercase;letter-spacing:0.06em;">Next step</p>
<p style="margin:0;color:#064e3b;font-weight:600;">Review the quotation and reply with PO / confirmation, or request amendments.</p>
</td>
</tr>
</table>`,
            ),
            buttonBlock('u_content_button_1', 'Review quotation'),
            textBlock(
              'u_content_text_3',
              '<p>If anything needs adjustment — quantities, delivery terms, or payment schedule — reply to this email and we’ll revise promptly.</p><p>Warm regards,<br/><strong>Sales team</strong></p>',
            ),
          ]),
        ]),
        row(
          'u_row_3',
          [
            column('u_column_3', [
              textBlock(
                'u_content_text_4',
                '<p style="text-align:center;font-size:12px;color:#94a3b8;">Need help? Call us or write to {{email}}</p>',
                { align: 'center' },
              ),
            ]),
          ],
          '#f8fafc',
        ),
      ],
      {
        u_row: 3,
        u_column: 3,
        u_content_text: 4,
        u_content_heading: 1,
        u_content_button: 1,
        u_content_html: 1,
      },
      'Your quotation is ready',
    ),
  },
  {
    key: 'invoice-reminder',
    name: 'Invoice / payment reminder',
    description: 'Courteous overdue or due-soon payment reminder',
    category: 'email',
    subject: 'Friendly reminder: invoice for {{company}}',
    design: design(
      [
        row('u_row_1', [
          column('u_column_1', [
            headingBlock('u_content_heading_1', 'Payment reminder', { color: '#b45309', size: '24px' }),
            textBlock(
              'u_content_text_1',
              '<p>Dear {{firstName}},</p><p>This is a friendly reminder regarding the outstanding balance for <strong>{{company}}</strong>. We value your business and want to make settlement as easy as possible.</p>',
            ),
            htmlBlock(
              'u_content_html_1',
              `<table width="100%" style="border-collapse:collapse;">
<tr><td style="padding:16px;border-left:4px solid #f59e0b;background:#fffbeb;">
<p style="margin:0 0 6px;font-size:12px;color:#92400e;text-transform:uppercase;">Action required</p>
<p style="margin:0;color:#78350f;font-size:14px;">Please arrange payment at your earliest convenience. If payment has already been made, kindly ignore this note or share the UTR / reference.</p>
</td></tr></table>`,
            ),
            buttonBlock('u_content_button_1', 'View invoice & pay'),
            textBlock(
              'u_content_text_2',
              '<p style="font-size:13px;color:#64748b;">Questions about this invoice? Reply to this email — accounts will assist you.</p>',
            ),
          ]),
        ]),
        row(
          'u_row_2',
          [
            column('u_column_2', [
              dividerBlock('u_content_divider_1'),
              textBlock(
                'u_content_text_3',
                '<p style="text-align:center;font-size:12px;color:#94a3b8;">Accounts receivable · FlowLedger<br/>{{email}} · {{phone}}</p>',
                { align: 'center' },
              ),
            ]),
          ],
          '#f8fafc',
        ),
      ],
      {
        u_row: 2,
        u_column: 2,
        u_content_text: 3,
        u_content_heading: 1,
        u_content_button: 1,
        u_content_divider: 1,
        u_content_html: 1,
      },
      'Invoice payment reminder',
    ),
  },
]

export const documentPresets: UnlayerPreset[] = [
  {
    key: 'tax-invoice-pro',
    name: 'Professional tax invoice',
    description: 'Logo, full customer block, and all bill line items',
    category: 'document',
    documentType: 'SALES_INVOICE',
    design: design(
      [
        row('u_row_1', [
          column('u_column_1', [
            htmlBlock(
              'u_content_html_logo',
              `{{logoHtml}}
<p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#0f172a;">{{organizationName}}</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748b;">GSTIN: {{gstin}} · {{organizationEmail}} · {{organizationPhone}}</p>`,
            ),
          ]),
          column('u_column_2', [
            textBlock(
              'u_content_text_2',
              '<p style="text-align:right;margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">{{documentTitle}}</p><p style="text-align:right;margin:6px 0 0;font-size:18px;font-weight:700;color:#0f172a;">{{invoiceNumber}}</p><p style="text-align:right;margin:4px 0 0;font-size:12px;color:#64748b;">Date: {{invoiceDate}}</p><p style="text-align:right;margin:10px 0 0;font-size:20px;font-weight:700;color:#0f766e;">₹ {{grandTotal}}</p>',
              { align: 'right' },
            ),
          ]),
        ]),
        row('u_row_2', [
          column('u_column_3', [
            dividerBlock('u_content_divider_1'),
            htmlBlock('u_content_html_customer', `{{customerDetails}}`),
          ]),
        ]),
        row('u_row_3', [
          column('u_column_4', [
            htmlBlock(
              'u_content_html_items',
              `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Description / items</p>{{lineItemsHtml}}`,
            ),
            textBlock(
              'u_content_text_3',
              '<p style="font-size:12px;color:#64748b;"><strong>Notes:</strong> {{notes}}</p><p style="font-size:12px;color:#64748b;"><strong>Terms:</strong> {{terms}}</p><p style="font-size:11px;color:#94a3b8;">This is a computer-generated tax invoice.</p>',
            ),
          ]),
        ]),
      ],
      {
        u_row: 3,
        u_column: 4,
        u_content_text: 2,
        u_content_divider: 1,
        u_content_html: 3,
      },
    ),
  },
  {
    key: 'quotation-pro',
    name: 'Professional quotation',
    description: 'Logo, customer details, and full quoted line items',
    category: 'document',
    documentType: 'QUOTATION',
    design: design(
      [
        row('u_row_1', [
          column('u_column_1', [
            htmlBlock(
              'u_content_html_logo',
              `{{logoHtml}}
<p style="margin:8px 0 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0f766e;font-weight:700;">Quotation</p>
<p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a;">{{organizationName}}</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748b;">GSTIN {{gstin}} · Ref {{invoiceNumber}} · {{invoiceDate}}</p>`,
            ),
          ]),
        ]),
        row('u_row_2', [column('u_column_2', [htmlBlock('u_content_html_customer', `{{customerDetails}}`)])]),
        row('u_row_3', [
          column('u_column_3', [
            htmlBlock(
              'u_content_html_1',
              `<div style="padding:14px;border-radius:12px;background:#ecfdf5;border:1px solid #99f6e4;margin-bottom:12px;">
<p style="margin:0 0 4px;font-size:12px;color:#0f766e;text-transform:uppercase;letter-spacing:0.08em;">Quoted total</p>
<p style="margin:0;font-size:26px;font-weight:700;color:#134e4a;">₹ {{grandTotal}}</p>
</div>
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Scope / line items</p>
{{lineItemsHtml}}`,
            ),
            textBlock(
              'u_content_text_3',
              '<p style="font-size:12px;color:#475569;"><strong>Notes:</strong> {{notes}}<br/><strong>Terms:</strong> {{terms}}</p><p style="font-size:12px;color:#64748b;">We look forward to your confirmation.</p>',
            ),
          ]),
        ]),
        row(
          'u_row_4',
          [
            column('u_column_4', [
              textBlock(
                'u_content_text_4',
                '<p style="text-align:center;font-size:11px;color:#94a3b8;margin:0;">{{organizationName}} · {{organizationEmail}} · {{organizationPhone}}</p>',
                { align: 'center' },
              ),
            ]),
          ],
          '#f8fafc',
        ),
      ],
      {
        u_row: 4,
        u_column: 4,
        u_content_text: 2,
        u_content_html: 3,
      },
    ),
  },
]

export function getEmailPreset(key: string) {
  return emailPresets.find((preset) => preset.key === key)
}

export function getDocumentPreset(key: string) {
  return documentPresets.find((preset) => preset.key === key)
}
