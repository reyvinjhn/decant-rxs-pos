const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbznJVFLAL9oSBiBTvzNz6pnTUeichtld29Ugo0Z1ZEvksBQ7hVzWmuy8hjLLjeJAJsWaA/exec";

// Fetch inventory items to display in your POS
export const fetchInventoryFromSheet = async () => {
  try {
    const response = await fetch(WEB_APP_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return [];
  }
};

// Send a completed transaction and deduct stock
export const recordTransactionToSheet = async (saleData) => {
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "recordSale",
        ...saleData,
      }),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to record sale:", error);
    return { success: false, error };
  }
};