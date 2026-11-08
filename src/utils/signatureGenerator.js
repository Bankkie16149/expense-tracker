/**
 * Utility to generate an authentic, cursive handwritten signature image
 * for PDF exports and digital signing.
 */
export const generateSignatureImage = (name = 'FinTrack User') => {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep executive blue ink color (#1e3a8a)
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#1e3a8a';

    // Set cursive signature font with fallbacks (Caveat for English, Charm for Thai)
    ctx.font = 'italic 38px "Caveat", "Charm", "Brush Script MT", "Segoe Script", "Dancing Script", "Apple Chancery", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    // Position text in center with natural tilted angle
    ctx.translate(canvas.width / 2, canvas.height / 2 - 8);
    ctx.rotate(-0.045); // ~ -2.6 degrees tilt
    ctx.fillText(name, 0, 0);

    // Measure text to draw flourish underline
    const metrics = ctx.measureText(name);
    const textWidth = metrics.width;
    const halfWidth = Math.min(canvas.width / 2 - 25, textWidth / 2 + 10);
    const startX = -halfWidth;
    const endX = halfWidth + 12;

    // Pen stroke flourish
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, 18);
    ctx.bezierCurveTo(startX * 0.2, 24, endX * 0.4, 14, endX, 20);
    ctx.bezierCurveTo(endX + 14, 22, endX + 10, 27, endX - 8, 25);
    ctx.stroke();

    ctx.restore();

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating signature image:', err);
    return null;
  }
};
