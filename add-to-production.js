const items = [
  {
    itemName: "Original Lishi Chrysler Truck Anti Glare 2-in-1 Pick & Decoder 8-Cut CY24 / Y157 / Y159",
    sku: "LISHI-CY24",
    category: "Tools",
    make: "Chrysler",
    model: "Truck",
    quantity: 1,
    cost: 49.50,
    supplier: "Original Lishi",
    lowStockThreshold: 3,
    fccId: null,
    keyType: "CY24",
    module: null,
    yearFrom: null,
    yearTo: null,
    imageUrl: null
  },
  {
    itemName: "2012 - 2021 Chevrolet Flip Key Fob 5B PEPS",
    sku: "5921873",
    category: "Prox / Smart Keys",
    make: "Chevrolet",
    model: "Various",
    quantity: 1,
    cost: 8.16,
    supplier: "AKS KEYS (New)",
    lowStockThreshold: 3,
    fccId: "OHT05918179",
    keyType: "Flip Key",
    module: null,
    yearFrom: 2012,
    yearTo: 2021,
    imageUrl: null
  },
  {
    itemName: "2010 - 2021 Chevrolet Flip Key Fob 5B",
    sku: "5912545",
    category: "Prox / Smart Keys",
    make: "Chevrolet",
    model: "Various",
    quantity: 2,
    cost: 6.28,
    supplier: "AKS KEYS (New)",
    lowStockThreshold: 3,
    fccId: "OHT01060512",
    keyType: "Flip Key",
    module: null,
    yearFrom: 2010,
    yearTo: 2021,
    imageUrl: null
  },
  {
    itemName: "2005 - 2014 Chrysler Key Fob 4B",
    sku: "OHT692427AA",
    category: "Prox / Smart Keys",
    make: "Chrysler",
    model: "Various",
    quantity: 1,
    cost: 5.68,
    supplier: "AKS KEYS (New)",
    lowStockThreshold: 3,
    fccId: "OHT692427AA",
    keyType: "Key Fob",
    module: null,
    yearFrom: 2005,
    yearTo: 2014,
    imageUrl: null
  },
  {
    itemName: "2005 - 2012 Dodge Key Fob 3B",
    sku: "OHTC92715AA",
    category: "Prox / Smart Keys",
    make: "Dodge",
    model: "Various",
    quantity: 2,
    cost: 9.80,
    supplier: "AKS KEYS (New)",
    lowStockThreshold: 3,
    fccId: "OHT692427AA",
    keyType: "Key Fob",
    module: null,
    yearFrom: 2005,
    yearTo: 2012,
    imageUrl: null
  },
  {
    itemName: "2014 - 2019 Toyota Corolla Key Fob 4B",
    sku: "HYQ12BEL",
    category: "Prox / Smart Keys",
    make: "Toyota",
    model: "Corolla",
    quantity: 2,
    cost: 9.69,
    supplier: "AKS KEYS (New)",
    lowStockThreshold: 3,
    fccId: "HYQ12BEL",
    keyType: "Key Fob",
    module: "H Chip",
    yearFrom: 2014,
    yearTo: 2019,
    imageUrl: null
  }
];

// You need to provide your production backend URL
const API_URL = process.argv[2];

if (!API_URL) {
  console.error('❌ Please provide your production backend URL as an argument');
  console.error('Usage: node add-to-production.js https://your-backend-url.com');
  process.exit(1);
}

async function addItems() {
  console.log(`🔗 Connecting to: ${API_URL}\n`);

  // Login with your production credentials
  const email = 'm.yassifi@gmail.com';
  const password = 'demo1234';

  try {
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const { token } = await loginResponse.json();
    console.log('✓ Logged in successfully\n');

    // Test with a simple item without 'model' field first to check schema
    console.log('🧪 Testing with a simple item (no model field)...');
    const testItem = {
      itemName: "Test Item Schema Check",
      sku: "TEST-" + Date.now(),
      category: "Tools",
      quantity: 1,
      cost: 10.00,
      lowStockThreshold: 1,
      keyType: "Test"
    };

    try {
      const response = await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testItem)
      });

      const responseText = await response.text();
      if (response.ok) {
        console.log(`✓ Test item added successfully! DB Connection works.`);
        // Clean up test item
        const data = JSON.parse(responseText);
        await fetch(`${API_URL}/api/inventory/${data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Test item cleaned up.`);
      } else {
        console.error(`✗ Test item failed: ${responseText}`);
        console.log('⚠️  This likely means the Deployment is effectively using the OLD code/schema.');
        process.exit(1);
      }
    } catch (e) {
      console.error(`✗ Connection error during test: ${e.message}`);
    }

    console.log('\n📦 Adding real inventory items...');

    // Add each item
    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        const response = await fetch(`${API_URL}/api/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item)
        });

        const responseText = await response.text();
        if (response.ok) {
          successCount++;
          console.log(`✓ Added: ${item.itemName.substring(0, 60)}...`);
        } else {
          failCount++;
          console.error(`✗ Failed: ${item.itemName.substring(0, 40)}... - Response: ${responseText}`);
        }
      } catch (error) {
        failCount++;
        console.error(`✗ Error: ${item.itemName.substring(0, 40)}... - ${error.message}`);
      }
    }

    console.log(`\n📊 Summary: ${successCount} added, ${failCount} failed`);
    console.log('✓ Done!');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

addItems().catch(console.error);
