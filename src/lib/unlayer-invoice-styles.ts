/** Unlayer invoice layout starters inspired by common professional design systems (excl. dark theme). */

type UnlayerDesign = Record<string, unknown>

function meta(id: string, className: string) {
  return { htmlID: id, htmlClassNames: className }
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

function row(id: string, columns: unknown[], backgroundColor = '#ffffff', cells?: number[]) {
  return {
    id,
    cells: cells && cells.length === columns.length ? cells : columns.map(() => 1),
    columns,
    values: {
      backgroundColor,
      columnsBackgroundColor: backgroundColor,
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      hideDesktop: false,
      displayCondition: null,
      columns: false,
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
        contentWidth: '640px',
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
        backgroundColor: '#ffffff',
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

export type InvoiceStylePreset = {
  key: string
  name: string
  description: string
  design: UnlayerDesign
}

type InvoiceStyle = {
  key: string
  titleFont: string
  titleColor: string
  titleSize: string
  titleWeight: string
  titleTransform: string
  accent: string
  softBg: string
  metaColor: string
  showGradientBar: boolean
  botanical: boolean
  serif: boolean
}

const BOTANICAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 420" width="72" height="260" aria-hidden="true">
  <g fill="none" stroke="#9CA3AF" stroke-width="1.2" opacity="0.55">
    <path d="M60 20 C40 80, 95 120, 55 180 C20 230, 85 280, 50 340 C35 370, 55 400, 60 410"/>
    <path d="M60 70 C25 90, 20 130, 55 150"/>
    <path d="M60 130 C95 145, 100 185, 62 205"/>
    <path d="M58 210 C22 230, 28 275, 56 295"/>
    <path d="M58 280 C92 300, 90 340, 58 360"/>
    <ellipse cx="38" cy="115" rx="18" ry="28" transform="rotate(-25 38 115)" fill="#E5E7EB" stroke="#9CA3AF"/>
    <ellipse cx="84" cy="168" rx="16" ry="26" transform="rotate(20 84 168)" fill="#E5E7EB" stroke="#9CA3AF"/>
    <ellipse cx="36" cy="252" rx="15" ry="24" transform="rotate(-18 36 252)" fill="#E5E7EB" stroke="#9CA3AF"/>
    <ellipse cx="82" cy="320" rx="14" ry="22" transform="rotate(22 82 320)" fill="#E5E7EB" stroke="#9CA3AF"/>
  </g>
</svg>`

function styledInvoiceDesign(style: InvoiceStyle): UnlayerDesign {
  const titleHtml = `<p style="margin:0;font-family:${style.titleFont};font-size:${style.titleSize};font-weight:${style.titleWeight};letter-spacing:${style.serif ? '0.02em' : '0.04em'};text-transform:${style.titleTransform};color:${style.titleColor};line-height:1.1;">Invoice</p>`

  const metaHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;color:${style.metaColor};">
<tr>
<td style="padding:4px 0;"><span style="display:block;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">Invoice no.</span><strong style="color:#0f172a;">{{invoiceNumber}}</strong></td>
<td style="padding:4px 0;"><span style="display:block;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">Issued</span><strong style="color:#0f172a;">{{invoiceDate}}</strong></td>
<td style="padding:4px 0;text-align:right;"><span style="display:block;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">Total</span><strong style="color:${style.accent};font-size:16px;">₹ {{grandTotal}}</strong></td>
</tr>
</table>`

  const partiesHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td width="50%" valign="top" style="padding-right:16px;">
<p style="margin:0 0 6px;font-family:${style.titleFont};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${style.metaColor};">Bill from</p>
<p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">{{organizationName}}</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.5;">GSTIN: {{gstin}}<br/>{{organizationEmail}}<br/>{{organizationPhone}}</p>
</td>
<td width="50%" valign="top" style="padding-left:16px;border-left:1px solid #e2e8f0;">
{{customerDetails}}
</td>
</tr>
</table>`

  const itemsHtml = `<div style="border-top:2px solid ${style.accent};padding-top:10px;">
<div style="background:${style.softBg};border-radius:4px;overflow:hidden;">{{lineItemsHtml}}</div>
</div>`

  const footerHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">
<tr>
<td width="55%" valign="top" style="padding-right:12px;">
<p style="margin:0 0 6px;font-family:${style.titleFont};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${style.metaColor};">Terms &amp; conditions</p>
<p style="margin:0;font-size:12px;color:#64748b;line-height:1.55;">{{terms}}</p>
<p style="margin:10px 0 0;font-size:12px;color:#64748b;"><strong>Notes:</strong> {{notes}}</p>
</td>
<td width="45%" valign="top" style="text-align:right;">
<p style="margin:0 0 4px;font-size:12px;color:#64748b;">Amount due</p>
<div style="display:inline-block;background:${style.softBg};border:1px solid ${style.accent}55;border-radius:6px;padding:10px 14px;min-width:160px;text-align:right;">
<p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${style.metaColor};">Total</p>
<p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${style.accent};">₹ {{grandTotal}}</p>
</div>
<p style="margin:28px 0 0;font-size:12px;color:#94a3b8;">Authorized signature</p>
<div style="margin:8px 0 0;border-bottom:1px solid #cbd5e1;width:160px;margin-left:auto;"></div>
</td>
</tr>
</table>`

  const rows: unknown[] = []

  if (style.showGradientBar) {
    rows.push(
      row('u_row_grad', [
        column('u_column_grad', [
          htmlBlock(
            'u_content_html_grad',
            `<div style="background:linear-gradient(90deg,#5EEAD4 0%,#67E8F9 55%,#A5F3FC 100%);padding:22px 20px;border-radius:4px 4px 0 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle">{{logoHtml}}<p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#0f172a;">{{organizationName}}</p></td>
<td valign="middle" style="text-align:right;"><p style="margin:0;font-family:${style.titleFont};font-size:${style.titleSize};font-weight:800;color:#0f172a;line-height:1.1;">Invoice</p></td>
</tr></table>
</div>`,
          ),
        ]),
      ]),
    )
    rows.push(row('u_row_meta', [column('u_column_meta', [htmlBlock('u_content_html_meta', metaHtml)])]))
  } else if (style.botanical) {
    rows.push(
      row(
        'u_row_bot',
        [
          column('u_column_leaf', [
            htmlBlock('u_content_html_leaf', `<div style="padding:12px 0 0 8px;">${BOTANICAL_SVG}</div>`),
          ]),
          column('u_column_main', [
            htmlBlock(
              'u_content_html_head',
              `<div style="padding-top:8px;">
{{logoHtml}}
<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#374151;">{{organizationName}}</p>
<div style="margin:18px 0 10px;">${titleHtml}</div>
${metaHtml}
</div>`,
            ),
          ]),
        ],
        '#ffffff',
        [1, 5],
      ),
    )
  } else {
    rows.push(
      row('u_row_head', [
        column('u_column_logo', [
          htmlBlock(
            'u_content_html_logo',
            `{{logoHtml}}
<p style="margin:8px 0 0;font-size:14px;font-weight:700;color:#0f172a;">{{organizationName}}</p>
<p style="margin:2px 0 0;font-size:11px;color:#64748b;">GSTIN {{gstin}}</p>`,
          ),
        ]),
        column('u_column_title', [
          htmlBlock(
            'u_content_html_title',
            `<div style="text-align:right;padding-top:4px;">${titleHtml}<div style="margin-top:12px;">${metaHtml}</div></div>`,
          ),
        ]),
      ]),
    )
  }

  rows.push(row('u_row_parties', [column('u_column_parties', [htmlBlock('u_content_html_parties', partiesHtml)])]))
  rows.push(row('u_row_items', [column('u_column_items', [htmlBlock('u_content_html_items', itemsHtml)])]))
  rows.push(row('u_row_footer', [column('u_column_footer', [htmlBlock('u_content_html_footer', footerHtml)])]))

  return design(
    rows,
    {
      u_row: rows.length,
      u_column: style.botanical ? 6 : 5,
      u_content_html: style.showGradientBar || style.botanical ? 6 : 5,
    },
    `${style.key} invoice layout`,
  )
}

export const styledInvoicePresets: InvoiceStylePreset[] = [
  {
    key: 'invoice-classic-sage',
    name: 'Classic sage',
    description: 'Clean black/white invoice with soft sage table accents',
    design: styledInvoiceDesign({
      key: 'classic',
      titleFont: 'Helvetica, Arial, sans-serif',
      titleColor: '#0f172a',
      titleSize: '34px',
      titleWeight: '700',
      titleTransform: 'none',
      accent: '#9CAF88',
      softBg: '#F3F6EF',
      metaColor: '#64748b',
      showGradientBar: false,
      botanical: false,
      serif: false,
    }),
  },
  {
    key: 'invoice-botanical',
    name: 'Botanical minimal',
    description: 'Airy layout with a soft leaf motif on the left',
    design: styledInvoiceDesign({
      key: 'botanical',
      titleFont: 'Helvetica, Arial, sans-serif',
      titleColor: '#1f2937',
      titleSize: '32px',
      titleWeight: '600',
      titleTransform: 'none',
      accent: '#6B7280',
      softBg: '#F9FAFB',
      metaColor: '#6B7280',
      botanical: true,
      serif: false,
      showGradientBar: false,
    }),
  },
  {
    key: 'invoice-mint-gradient',
    name: 'Mint gradient',
    description: 'Modern mint-to-sky header bar with bold invoice title',
    design: styledInvoiceDesign({
      key: 'mint',
      titleFont: 'Helvetica, Arial, sans-serif',
      titleColor: '#0f172a',
      titleSize: '36px',
      titleWeight: '800',
      titleTransform: 'none',
      accent: '#14B8A6',
      softBg: '#ECFEFF',
      metaColor: '#0F766E',
      showGradientBar: true,
      botanical: false,
      serif: false,
    }),
  },
  {
    key: 'invoice-coral-accent',
    name: 'Coral accent',
    description: 'Warm coral titles and table accents',
    design: styledInvoiceDesign({
      key: 'coral',
      titleFont: "Georgia, 'Times New Roman', serif",
      titleColor: '#E07A5F',
      titleSize: '40px',
      titleWeight: '700',
      titleTransform: 'uppercase',
      accent: '#E07A5F',
      softBg: '#FFF7F5',
      metaColor: '#9A3412',
      showGradientBar: false,
      botanical: false,
      serif: true,
    }),
  },
  {
    key: 'invoice-elegant-serif',
    name: 'Elegant classic',
    description: 'Premium serif typography with generous whitespace',
    design: styledInvoiceDesign({
      key: 'elegant',
      titleFont: "Georgia, 'Times New Roman', serif",
      titleColor: '#111827',
      titleSize: '42px',
      titleWeight: '500',
      titleTransform: 'none',
      accent: '#111827',
      softBg: '#FAFAF9',
      metaColor: '#57534E',
      showGradientBar: false,
      botanical: false,
      serif: true,
    }),
  },
  {
    key: 'invoice-ivonne',
    name: 'Ivonne hosting',
    description: 'Clean hosting-style layout with tax %, discount %, and payment summary',
    design: ivonneInvoiceDesign(),
  },
]

function ivonneInvoiceDesign(): UnlayerDesign {
  const header = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
<tr>
<td valign="top">
<p style="margin:0;font-size:22px;font-weight:700;color:#111827;">#{{invoiceNumber}}</p>
</td>
<td valign="top" align="right">
{{logoHtml}}
<p style="margin:6px 0 0;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0F766E;">{{organizationName}}</p>
</td>
</tr>
</table>`

  const meta = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:18px;font-family:Helvetica,Arial,sans-serif;">
<tr>
<td width="50%" valign="top" style="padding-right:16px;">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#111827;">Invoice / Receipt</p>
<p style="margin:0;font-size:13px;color:#4B5563;line-height:1.7;">
<strong>Invoice:</strong> #{{invoiceNumber}}<br/>
<strong>Customer:</strong> {{customerCode}}<br/>
<strong>Date:</strong> {{invoiceDate}}
</p>
</td>
<td width="50%" valign="top" style="padding-left:16px;text-align:right;">
<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">{{organizationName}}</p>
<p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">{{organizationAddress}}<br/>{{organizationEmail}}<br/>GSTIN {{gstin}}</p>
</td>
</tr>
</table>`

  const boxes = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0;margin-top:20px;font-family:Helvetica,Arial,sans-serif;">
<tr>
<td width="50%" valign="top" style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;">
<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#111827;">Bill To</p>
<p style="margin:0;font-size:14px;font-weight:600;color:#111827;">{{customerName}}</p>
<p style="margin:6px 0 0;font-size:12px;color:#6B7280;line-height:1.55;">{{customerAddress}}<br/>{{customerCity}}, {{customerState}} {{customerCountry}}<br/>{{customerPhone}}<br/>{{customerEmail}}</p>
</td>
<td width="50%" valign="top" style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;">
<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#111827;">Payment INFO</p>
<p style="margin:0;font-size:14px;font-weight:600;color:#111827;">{{customerName}}</p>
<p style="margin:8px 0 0;font-size:12px;color:#6B7280;line-height:1.7;">
<strong>Paid:</strong> ₹ {{amountPaid}}<br/>
<strong>Due:</strong> ₹ {{outstandingAmount}}<br/>
<strong>Total:</strong> ₹ {{grandTotal}}
</p>
</td>
</tr>
</table>`

  const note = `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #E5E7EB;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">Note:</p>
<p style="margin:0;font-size:12px;color:#6B7280;line-height:1.55;">{{notes}}</p>
<p style="margin:10px 0 0;font-size:12px;color:#9CA3AF;"><strong>Terms:</strong> {{terms}}</p>
</div>`

  return design(
    [
      row('u_row_iv1', [column('u_column_iv1', [htmlBlock('u_content_html_iv1', header)])]),
      row('u_row_iv2', [column('u_column_iv2', [htmlBlock('u_content_html_iv2', meta)])]),
      row('u_row_iv3', [column('u_column_iv3', [htmlBlock('u_content_html_iv3', boxes)])]),
      row('u_row_iv4', [
        column('u_column_iv4', [
          htmlBlock('u_content_html_iv4', `<div style="margin-top:8px;">{{lineItemsHtmlIvonne}}</div>`),
        ]),
      ]),
      row('u_row_iv5', [column('u_column_iv5', [htmlBlock('u_content_html_iv5', note)])]),
    ],
    { u_row: 5, u_column: 5, u_content_html: 5 },
    'Ivonne invoice layout',
  )
}
