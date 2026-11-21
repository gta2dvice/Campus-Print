const fs = require('fs');
const path = require('path');

// Current working directory is C:\Users\karti\OneDrive\Desktop\wagon1\Campus-Print-main\client-react
const filePath = path.join(__dirname, 'src/pages/NewOrder.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the location selection buttons to use handleLocationSelect
const oldBtn = 'onClick={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}';
const newBtn = 'onClick={() => handleLocationSelect(loc.id, loc.name)}';

if (content.includes(oldBtn)) {
    console.log('Replacing location selection onClick...');
    content = content.split(oldBtn).join(newBtn);
} else {
    console.log('Old button text not found. Checking for variants...');
}

// 2. Ensure handleLocationSelect is implemented correctly
if (!content.includes('function handleLocationSelect')) {
    console.log('Injecting handleLocationSelect...');
    const insertionPoint = 'function buildOrderFormData() {';
    const functionDef = `
function handleLocationSelect(locId, locName) {
  setSelectedLocationId(locId);
  setSelectedLocationName(locName);

  if (locId === 'academic-block') {
    const wantsDelivery = window.confirm('Do you want Classroom Delivery for an additional ₹10?');
    setClassroomDelivery(wantsDelivery);
  } else {
    setClassroomDelivery(false);
  }
}

`;
    content = content.replace(insertionPoint, functionDef + insertionPoint);
}

fs.writeFileSync(filePath, content);
console.log('File updated successfully.');
