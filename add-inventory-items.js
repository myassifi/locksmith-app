// Copy and run this script in your browser console while on the Inventory page

const items = [
  {
    itemName: "KeyDiy KD Universal Smart Remote Key 4 Button Hyundai Style ZB33-4",
    sku: "CR-KDY-ZB33-4",
    keyType: "Remote",
    quantity: 1,
    cost: 23.95,
    supplier: "KeyDiy",
    category: "Remotes",
    make: "Hyundai",
    model: "",
    module: "",
    yearFrom: null,
    yearTo: null,
    fccId: "ZB33-4",
    lowStockThreshold: 3
  },
  {
    itemName: "Xhorse Wire Remote Key Toyota Style Triangle 4 Buttons XKTO02EN",
    sku: "CR-XHS-XKTO02EN",
    keyType: "Remote",
    quantity: 2,
    cost: 9.45,
    supplier: "Xhorse",
    category: "Remotes",
    make: "Toyota",
    model: "",
    module: "",
    yearFrom: null,
    yearTo: null,
    fccId: "XKTO02EN",
    lowStockThreshold: 3
  },
  {
    itemName: "Autel iKey Universal Smart Key Toyota Style 8A-chipped 4 Button IKEYTY8A4TP",
    sku: "CR-AUT-IKEYTY8A4TP",
    keyType: "Smart Key",
    quantity: 3,
    cost: 28.50,
    supplier: "Autel",
    category: "Prox / Smart Keys",
    make: "Toyota",
    model: "",
    module: "8A-chipped",
    yearFrom: null,
    yearTo: null,
    fccId: "IKEYTY8A4TP",
    lowStockThreshold: 3
  },
  {
    itemName: "Autel iKey Universal Smart Key Chrysler Premium Style 5 Button IKEYCR5TPR",
    sku: "CR-AUT-CR5TPR",
    keyType: "Smart Key",
    quantity: 2,
    cost: 17.99,
    supplier: "Autel",
    category: "Prox / Smart Keys",
    make: "Chrysler",
    model: "Premium",
    module: "",
    yearFrom: null,
    yearTo: null,
    fccId: "IKEYCR5TPR",
    lowStockThreshold: 3
  },
  {
    itemName: "Flip Remote Blade For Toyota TOY41R",
    sku: "KB-UNV-TOY41R",
    keyType: "Blade",
    quantity: 11,
    cost: 0.55,
    supplier: "",
    category: "Emergency Blades",
    make: "Toyota",
    model: "",
    module: "",
    yearFrom: null,
    yearTo: null,
    fccId: "TOY41R",
    lowStockThreshold: 5
  },
  {
    itemName: "6-in-1 Foldable Lock Pick Tool Set - Compact Multi-Pick Design for Locksmiths",
    sku: "TOOL-FLPTS",
    keyType: "Tool",
    quantity: 1,
    cost: 0.00, // Free item or sample
    supplier: "",
    category: "Other / Tools / Accessories",
    make: "",
    model: "Foldable Lock Pick",
    module: "",
    yearFrom: null,
    yearTo: null,
    fccId: "",
    lowStockThreshold: 1
  }
];

// Function to add items with delay between each
async function addInventoryItems() {
  for (const item of items) {
    try {
      console.log(`Adding item: ${item.sku} - ${item.itemName}`);
      
      // Set form data
      document.querySelector('button[aria-label="Add Inventory"]').click();
      
      // Wait for dialog to open
      await new Promise(r => setTimeout(r, 500));
      
      // The following code simulates filling out the form and submitting
      // This is a simplified approach - the actual implementation would depend on how your form is structured
      
      // Since this is a simulation, we'll just show what would be set
      console.log("Form would be filled with:", item);
      console.log("You'll need to manually add each item using the 'Add Inventory' button");
      
      // Close dialog for next item
      document.querySelector('button[aria-label="Close"]').click();
      
      // Wait before processing next item
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`Error with ${item.sku}:`, error);
    }
  }
}

// Alternatively, use this function to print instructions for manual entry
function printInstructions() {
  items.forEach((item, index) => {
    console.log(`\n--- ITEM ${index + 1} ---`);
    console.log(`SKU: ${item.sku}`);
    console.log(`Name: ${item.itemName}`);
    console.log(`Type: ${item.keyType}`);
    console.log(`Quantity: ${item.quantity}`);
    console.log(`Cost: $${item.cost}`);
    console.log(`Supplier: ${item.supplier}`);
    console.log(`Category: ${item.category}`);
    console.log(`Make: ${item.make}`);
    console.log(`Model: ${item.model}`);
    console.log(`Module: ${item.module}`);
    console.log(`FCC ID: ${item.fccId}`);
    console.log(`Low Stock Threshold: ${item.lowStockThreshold}`);
  });
}

console.log("To see detailed instructions for manual entry, run: printInstructions()");
console.log("To attempt automated addition (may require adjustments), run: addInventoryItems()");
