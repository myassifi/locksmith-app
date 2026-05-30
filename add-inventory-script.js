// Script for adding inventory items
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
    module: "8A-chipped",
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
    fccId: "IKEYCR5TPR",
    lowStockThreshold: 3
  },
  {
    itemName: "Flip Remote Blade For Toyota TOY41R",
    sku: "KB-UNV-TOY41R",
    keyType: "Blade",
    quantity: 11,
    cost: 0.55,
    category: "Emergency Blades",
    make: "Toyota",
    fccId: "TOY41R",
    lowStockThreshold: 5
  },
  {
    itemName: "6-in-1 Foldable Lock Pick Tool Set - Compact Multi-Pick Design for Locksmiths",
    sku: "TOOL-FLPTS",
    keyType: "Tool",
    quantity: 1,
    cost: 0.00,
    category: "Other / Tools / Accessories",
    model: "Foldable Lock Pick",
    lowStockThreshold: 1
  }
];

// Export the items for use
module.exports = items;
