// WebUSB and Web Serial implementations for ESC/POS Thermal Printers

/**
 * Commands ESC/POS
 */
const ESC_POS = {
  INIT: new Uint8Array([0x1B, 0x40]), // Initialize printer
  TEXT_FORMAT_DEFAULT: new Uint8Array([0x1B, 0x21, 0x00]), // Default font
  TEXT_FORMAT_BOLD: new Uint8Array([0x1B, 0x21, 0x08]), // Bold text
  ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]), // Center alignment
  ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]), // Left alignment
  CUT: new Uint8Array([0x1D, 0x56, 0x00]), // Full cut
  OPEN_DRAWER: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]) // Open cash drawer (Pulse)
};

/**
 * Prints a receipt and opens the cash drawer using WebUSB
 */
export async function printReceiptAndOpenDrawerUSB(text: string) {
  try {
    const device = await navigator.usb.requestDevice({ filters: [] }); // User selects printer
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    const encoder = new TextEncoder();
    const data = encoder.encode(text + '\n\n\n');

    // Combine commands
    const buffer = new Uint8Array([
      ...ESC_POS.INIT,
      ...ESC_POS.ALIGN_CENTER,
      ...ESC_POS.TEXT_FORMAT_BOLD,
      ...encoder.encode("RAIMEN TICKET\n"),
      ...ESC_POS.TEXT_FORMAT_DEFAULT,
      ...ESC_POS.ALIGN_LEFT,
      ...data,
      ...ESC_POS.OPEN_DRAWER,
      ...ESC_POS.CUT
    ]);

    // Send data to endpoint 1 (usually the OUT endpoint for printers, might need discovery in production)
    await device.transferOut(1, buffer);

    await device.close();
    return true;
  } catch (error) {
    console.error('WebUSB Error:', error);
    return false;
  }
}

/**
 * Prints a receipt and opens the cash drawer using Web Serial
 */
export async function printReceiptAndOpenDrawerSerial(text: string) {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 }); // Common default for serial printers

    const writer = port.writable?.getWriter();
    if (!writer) throw new Error('Cannot get writer from port');

    const encoder = new TextEncoder();
    const data = encoder.encode(text + '\n\n\n');

    // Combine commands
    const buffer = new Uint8Array([
      ...ESC_POS.INIT,
      ...ESC_POS.ALIGN_CENTER,
      ...ESC_POS.TEXT_FORMAT_BOLD,
      ...encoder.encode("RAIMEN TICKET\n"),
      ...ESC_POS.TEXT_FORMAT_DEFAULT,
      ...ESC_POS.ALIGN_LEFT,
      ...data,
      ...ESC_POS.OPEN_DRAWER,
      ...ESC_POS.CUT
    ]);

    await writer.write(buffer);
    writer.releaseLock();
    await port.close();
    
    return true;
  } catch (error) {
    console.error('Web Serial Error:', error);
    return false;
  }
}

/**
 * Helper to simply open the cash drawer
 */
export async function openCashDrawerUSB() {
  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    await device.transferOut(1, ESC_POS.OPEN_DRAWER);
    await device.close();
    return true;
  } catch (error) {
    console.error('WebUSB Drawer Error:', error);
    return false;
  }
}
