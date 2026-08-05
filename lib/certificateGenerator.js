import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

const POSITIONS_PATH = path.join(process.cwd(), 'config', 'certificate-positions.json');
const TEMPLATE_DIR = path.join(process.cwd(), 'public', 'templates', 'certificates');

let cachedPositions = null;
function loadPositions() {
    if (!cachedPositions) {
        cachedPositions = JSON.parse(fs.readFileSync(POSITIONS_PATH, 'utf8'));
    }
    return cachedPositions;
}

const ROLE_LABEL = {
    winner: '1st Place — Winner',
    runner_up: '2nd Place — Runner-Up',
    third_place: '3rd Place',
    participant: 'Participant',
};

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return rgb(0, 0, 0);
    return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

function pickFont(pdfDoc, name) {
    const map = {
        'Helvetica': StandardFonts.Helvetica,
        'Helvetica-Bold': StandardFonts.HelveticaBold,
        'Helvetica-Oblique': StandardFonts.HelveticaOblique,
        'Times-Roman': StandardFonts.TimesRoman,
        'Times-Bold': StandardFonts.TimesRomanBold,
        'Courier': StandardFonts.Courier,
        'Courier-Bold': StandardFonts.CourierBold,
    };
    return pdfDoc.embedFont(map[name] || StandardFonts.Helvetica);
}

function wrapText(font, text, size, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const width = font.widthOfTextAtSize(test, size);
        if (width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function drawText(page, font, value, field) {
    if (!value) return;
    const color = hexToRgb(field.color || '#000000');
    const align = field.align || 'left';
    const lineHeight = field.size * 1.35;

    const rawParagraphs = String(value).split('\n');
    let currentY = field.y;

    for (const p of rawParagraphs) {
        const lines = wrapText(font, p, field.size, field.maxWidth || 600);
        for (const text of lines) {
            const textWidth = font.widthOfTextAtSize(text, field.size);
            let x = field.x;
            if (align === 'center') x = field.x - textWidth / 2;
            else if (align === 'right') x = field.x - textWidth;
            page.drawText(text, { x, y: currentY, size: field.size, font, color });
            currentY -= lineHeight;
        }
    }
}

async function generateQrPng(text, sizePx = 240) {
    return await QRCode.toBuffer(text, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: sizePx,
        color: { dark: '#000000', light: '#ffffff' },
    });
}

function resolveTemplatePath(positions, eventRole, opts) {
    if (opts?.templatePath && fs.existsSync(opts.templatePath)) return opts.templatePath;
    const configKey = eventRole || 'participant';
    const config = positions[configKey] || positions.participant;
    const tplName = (config && config.template) || `${configKey}.pdf`;
    const p = path.join(TEMPLATE_DIR, tplName);
    if (fs.existsSync(p)) return p;
    throw new Error(`Template not found: ${p}`);
}

/**
 * Build a certificate PDF.
 */
export async function generateCertificate({ templatePath, name, eventName, eventRole, certId, verifyUrl }) {
    const positions = loadPositions();
    const configKey = eventRole || 'participant';
    const config = positions[configKey] || positions.participant;
    if (!config) throw new Error(`No position config for role "${eventRole}"`);

    const resolvedTemplate = resolveTemplatePath(positions, eventRole, { templatePath });
    const templateBytes = fs.readFileSync(resolvedTemplate);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const pageIndex = config.pageIndex || 0;
    const page = pdfDoc.getPage(pageIndex);
    if (!page) throw new Error(`Template has no page ${pageIndex}`);

    // 1. Draw white-out mask rectangles if defined
    if (Array.isArray(config.masks)) {
        for (const mask of config.masks) {
            page.drawRectangle({
                x: mask.x,
                y: mask.y,
                width: mask.width,
                height: mask.height,
                color: rgb(1, 1, 1),
            });
        }
    }

    // 2. Cache fonts needed
    const fontsNeeded = new Set(Object.values(config.fields).map(f => f.font).filter(Boolean));
    const fontCache = {};
    for (const fname of fontsNeeded) {
        fontCache[fname] = await pickFont(pdfDoc, fname);
    }

    // 3. Draw fields
    for (const [key, field] of Object.entries(config.fields)) {
        if (key === 'qr') continue;
        const font = fontCache[field.font || positions._defaultFont || 'Helvetica'];
        let value;
        if (key === 'name') value = name;
        else if (key === 'eventName') value = eventName;
        else if (key === 'eventText') {
            value = (field.format || '{eventName}').replace(/\{eventName\}/g, eventName || '');
        }
        else if (key === 'role') value = field.text || ROLE_LABEL[eventRole] || 'Participant';
        else if (key === 'certId') value = `Certificate ID: ${certId}`;
        else continue;

        drawText(page, font, value, field);
    }

    // 4. Draw QR Code
    const qrField = config.fields.qr;
    if (qrField && verifyUrl) {
        const qrPng = await generateQrPng(verifyUrl, 300);
        const qrImg = await pdfDoc.embedPng(qrPng);
        const size = qrField.size || 65;
        const qrX = qrField.align === 'center' ? qrField.x - size / 2 : qrField.x;
        page.drawImage(qrImg, {
            x: qrX,
            y: qrField.y,
            width: size,
            height: size,
        });
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
}

export { ROLE_LABEL };
