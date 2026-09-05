import { randomUUID } from 'node:crypto';
if (!process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD) throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD in the environment.');
// ES Module script to add inventory items
import fetch from 'node-fetch';

const BACKEND_URL = 'https://locksmith-app-production.up.railway.app';

// Items from the receipt
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

// Map item fields to API format
function mapInventoryToApi(item) {
  return {
    itemName: item.itemName,
    sku: item.sku,
    keyType: item.keyType || null,
    quantity: item.quantity,
    cost: item.cost,
    supplier: item.supplier || null,
    category: item.category,
    make: item.make || null,
    model: item.model || null,
    module: item.module || null,
    yearFrom: item.yearFrom || null,
    yearTo: item.yearTo || null,
    fccId: item.fccId || null,
    lowStockThreshold: item.lowStockThreshold || 3
  };
}

// Function to login and get token
async function login() {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: process.env.OWNER_EMAIL,
        password: process.env.OWNER_PASSWORD
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Function to add an inventory item
async function addInventoryItem(item, token) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 'Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(mapInventoryToApi(item))
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add item: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error adding item ${item.sku}:`, error);
    throw error;
  }
}

// Main function to add all items
async function addAllItems() {
  try {
    console.log('Checking API health...');
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    console.log(`API health status: ${healthCheck.status}`);
    
    if (!healthCheck.ok) {
      console.error('API not healthy. Aborting.');
      return;
    }
    
    console.log('Logging in...');
    const token = await login();
    console.log('Login successful.');
    
    console.log('Adding inventory items...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
      try {
        console.log(`Adding item: ${item.sku} - ${item.itemName}`);
        await addInventoryItem(item, token);
        console.log(`✓ Successfully added ${item.sku}`);
        successCount++;
      } catch (error) {
        console.error(`× Failed to add ${item.sku}`);
        errorCount++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Total items processed: ${items.length}`);
    console.log(`- Successfully added: ${successCount}`);
    console.log(`- Failed to add: ${errorCount}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the script
addAllItems();
