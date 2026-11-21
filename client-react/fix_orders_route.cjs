const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/routes/orders.js');
let content = fs.readFileSync(filePath, 'utf8');

// We need to update calculateTotalPrice to enforce the Academic Block restriction.
// Current implementation:
// if (data.collectionLocationId === 'hostel-gate') {
//     deliveryCharge = PRICING.hostelSurcharge;
// } else if (data.classroomDelivery === 'true' || data.classroomDelivery === true) {
//     deliveryCharge = PRICING.classroomDelivery;
// }

const oldCalc = `    if (data.collectionLocationId === 'hostel-gate') {
      deliveryCharge = PRICING.hostelSurcharge;
    } else if (data.classroomDelivery === 'true' || data.classroomDelivery === true) {
      deliveryCharge = PRICING.classroomDelivery;
    } `;

const newCalc = `    if (data.collectionLocationId === 'hostel-gate') {
      deliveryCharge = PRICING.hostelSurcharge;
    } else if (data.collectionLocationId === 'academic-block' && (data.classroomDelivery === 'true' || data.classroomDelivery === true)) {
      deliveryCharge = PRICING.classroomDelivery;
    } `;

if (content.includes(oldCalc)) {
    console.log('Updating calculateTotalPrice pricing logic...');
    content = content.replace(oldCalc, newCalc);
} else {
    console.log('Original calculateTotalPrice block not found. Searching for similar content...');
    // If exact match fails, we'll try a more robust replacement.
    const regex = /if\s*\(data\.collectionLocationId\s*===\s*['"]hostel-gate['"]\)\s*\{\s*deliveryCharge\s*=\s*PRICING\.hostelSurcharge;\s*\}\s*else\s*if\s*\(data\.classroomDelivery\s*===\s*['"]true['"]\s*||\s*data\.classroomDelivery\s*===\s*true\)\s*\{\s*deliveryCharge\s*=\s*PRICING\.classroomDelivery;\s*\}/;
    if (regex.test(content)) {
        console.log('Found using regex. Replacing...');
        content = content.replace(regex, newCalc);
    } else {
        console.log('Could not find the pricing logic block to replace.');
    }
}

fs.writeFileSync(filePath, content);
console.log('Server route updated successfully.');
