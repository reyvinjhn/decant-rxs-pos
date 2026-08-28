import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Package, Plus, Trash2, Store, Check, AlertCircle, X, Edit2, RefreshCw } from 'lucide-react';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAhgvfdoAuclg3g-grTwEXuoIqvW7PElX92TjFSyI-7UxoHO92Gb7Sv13faIWIryEYMg/exec";

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('shop');
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const data = await res.json();
      
      const formatted = data.map((item, idx) => ({
        id: item.id ? Number(item.id) : idx + 1,
        name: item.name || item.Name || "Unnamed Fragrance",
        owner: item.owner || item.Owner || "Decant RXS",
        stockML: Number(item.stockML || item.StockML || item.stock || 100),
        price5ml: Number(item.price5ml || item.price5ML || item.Price5ml || 0),
        price10ml: Number(item.price10ml || item.price10ML || item.Price10ml || 0),
      }));
      setInventory(formatted);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      showNotification("Could not sync inventory from Google Sheets.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addToCart = (perfume, size, price) => {
    const mlToDeduct = size === '5ml' ? 5 : 10;
    const currentCartQuantityForPerfume = cart
      .filter(item => item.perfumeId === perfume.id)
      .reduce((total, item) => total + (item.size === '5ml' ? 5 * item.quantity : 10 * item.quantity), 0);
      
    if (perfume.stockML < currentCartQuantityForPerfume + mlToDeduct) {
       showNotification(`Not enough stock for another ${size} of ${perfume.name}`, 'error');
       return;
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.perfumeId === perfume.id && item.size === size);
      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { id: Date.now(), perfumeId: perfume.id, name: perfume.name, owner: perfume.owner, size, price, quantity: 1 }];
      }
    });
    showNotification(`${perfume.name} (${size}) added to cart!`);
  };

  const removeFromCart = (cartItemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== cartItemId));
  };

  const checkout = async () => {
    if (cart.length === 0) return;

    try {
      const orderData = {
        action: "recordSale",
        purchasedItems: cart.map(i => ({
          perfumeId: i.perfumeId,
          name: i.name,
          size: i.size,
          price: i.price,
          quantity: i.quantity,
          owner: i.owner
        }))
      };

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      await fetchInventory();
      setCart([]);
      setActiveTab('shop');
      showNotification('Checkout successful! Logged to Google Sheet.', 'success');
    } catch (err) {
      console.error("Error saving sale to Google Sheets:", err);
      showNotification("Failed to sync transaction to cloud.", "error");
    }
  };

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.price * item.quantity), 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-lg">Loading Inventory from Google Sheets...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <nav className="bg-neutral-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-amber-400" />
            <span className="text-xl font-bold tracking-widest uppercase">Decant RXS</span>
          </div>
          <div className="flex space-x-6">
            <button onClick={() => setActiveTab('shop')} className={`flex items-center space-x-1 cursor-pointer ${activeTab === 'shop' ? 'text-amber-400' : 'text-neutral-300'}`}>
              <Store className="h-5 w-5" /><span>Storefront</span>
            </button>
            <button onClick={() => setActiveTab('admin')} className={`flex items-center space-x-1 cursor-pointer ${activeTab === 'admin' ? 'text-amber-400' : 'text-neutral-300'}`}>
              <Edit2 className="h-5 w-5" /><span>Admin</span>
            </button>
            <button onClick={() => setActiveTab('cart')} className={`flex items-center space-x-1 relative cursor-pointer ${activeTab === 'cart' ? 'text-amber-400' : 'text-neutral-300'}`}>
              <ShoppingCart className="h-5 w-5" /><span>Cart</span>
              {cartItemCount > 0 && <span className="absolute -top-2 -right-3 bg-amber-500 text-neutral-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{cartItemCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-2 z-50 text-white ${notification.type === 'error' ? 'bg-red-600' : 'bg-neutral-800'}`}>
          {notification.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5 text-amber-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'shop' && <CustomerView inventory={inventory} onAddToCart={addToCart} onRefresh={fetchInventory} />}
        {activeTab === 'admin' && <AdminView inventory={inventory} setInventory={setInventory} onRefresh={fetchInventory} showNotification={showNotification} />}
        {activeTab === 'cart' && <CartView cart={cart} removeFromCart={removeFromCart} total={cartTotal} checkout={checkout} />}
      </main>
    </div>
  );
}

function CustomerView({ inventory, onAddToCart, onRefresh }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">Select Your Fragrance</h1>
          <p className="text-neutral-500">Live inventory synced from Google Sheets.</p>
        </div>
        <button onClick={onRefresh} className="flex items-center space-x-1 bg-white border border-neutral-300 px-3 py-2 rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">
          <RefreshCw className="h-4 w-4" /><span>Sync Stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map(perfume => (
          <PerfumeCard key={perfume.id} perfume={perfume} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  );
}

function PerfumeCard({ perfume, onAddToCart }) {
  const [selectedSize, setSelectedSize] = useState('5ml');
  const canBuy5ml = perfume.stockML >= 5;
  const canBuy10ml = perfume.stockML >= 10;
  const isOutOfStock = perfume.stockML < 5;

  useEffect(() => {
    if (selectedSize === '10ml' && !canBuy10ml && canBuy5ml) setSelectedSize('5ml');
  }, [perfume.stockML, selectedSize, canBuy10ml, canBuy5ml]);

  const currentPrice = selectedSize === '5ml' ? perfume.price5ml : perfume.price10ml;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-neutral-800">{perfume.name}</h3>
            <p className="text-xs text-neutral-400 mt-1">Owner: {perfume.owner}</p>
          </div>
          {isOutOfStock ? (
             <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>
          ) : (
             <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{perfume.stockML}ml Available</span>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${selectedSize === '5ml' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'} ${!canBuy5ml ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center">
              <input type="radio" name={`size-${perfume.id}`} value="5ml" checked={selectedSize === '5ml'} onChange={() => canBuy5ml && setSelectedSize('5ml')} disabled={!canBuy5ml} className="h-4 w-4 text-neutral-900" />
              <span className="ml-3 font-medium">5ml Decant</span>
            </div>
            <span className="font-semibold">₱{perfume.price5ml?.toLocaleString()}</span>
          </label>

          <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${selectedSize === '10ml' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'} ${!canBuy10ml ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center">
              <input type="radio" name={`size-${perfume.id}`} value="10ml" checked={selectedSize === '10ml'} onChange={() => canBuy10ml && setSelectedSize('10ml')} disabled={!canBuy10ml} className="h-4 w-4 text-neutral-900" />
              <span className="ml-3 font-medium">10ml Decant</span>
            </div>
            <span className="font-semibold">₱{perfume.price10ml?.toLocaleString()}</span>
          </label>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 border-t border-neutral-100 mt-auto">
        <button onClick={() => onAddToCart(perfume, selectedSize, currentPrice)} disabled={isOutOfStock || (selectedSize === '10ml' && !canBuy10ml)} className="w-full flex items-center justify-center space-x-2 bg-neutral-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 cursor-pointer">
          <ShoppingCart className="h-5 w-5" /><span>Add to Cart - ₱{currentPrice?.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}

function AdminView({ inventory, setInventory, onRefresh, showNotification }) {
  const [newPerfume, setNewPerfume] = useState({ name: '', owner: '', stockML: '', price5ml: '', price10ml: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPerfume.name || !newPerfume.owner || !newPerfume.stockML) return;

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "addPerfume",
          name: newPerfume.name,
          owner: newPerfume.owner,
          stockML: newPerfume.stockML,
          price5ml: newPerfume.price5ml,
          price10ml: newPerfume.price10ml
        })
      });

      showNotification("Item added to Google Sheets Inventory!");
      setNewPerfume({ name: '', owner: '', stockML: '', price5ml: '', price10ml: '' });
      setTimeout(onRefresh, 1500);
    } catch (err) {
      console.error("Failed to add to sheet:", err);
      showNotification("Error adding item to sheet.", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name} from Google Sheets?`)) return;

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "deletePerfume",
          id: item.id,
          name: item.name
        })
      });

      showNotification("Item deleted from Google Sheets!");
      setTimeout(onRefresh, 1500);
    } catch (err) {
      console.error("Failed to delete from sheet:", err);
      showNotification("Error deleting item.", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Inventory Management</h1>
          <p className="text-neutral-500">Live products synced from your Google Sheet.</p>
        </div>
        <button onClick={onRefresh} className="flex items-center space-x-1 bg-white border border-neutral-300 px-3 py-2 rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">
          <RefreshCw className="h-4 w-4" /><span>Refresh Inventory</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center"><Plus className="h-5 w-5 mr-2" /> Add New Inventory Item</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Perfume Name</label>
            <input type="text" required value={newPerfume.name} onChange={(e) => setNewPerfume({...newPerfume, name: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none" placeholder="Bleu de Chanel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Owner</label>
            <input type="text" required value={newPerfume.owner} onChange={(e) => setNewPerfume({...newPerfume, owner: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none" placeholder="Decant RXS" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Total (ML)</label>
            <input type="number" required min="1" value={newPerfume.stockML} onChange={(e) => setNewPerfume({...newPerfume, stockML: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none" placeholder="100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">5ml Price</label>
            <input type="number" min="0" value={newPerfume.price5ml} onChange={(e) => setNewPerfume({...newPerfume, price5ml: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none" placeholder="800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">10ml Price</label>
            <input type="number" min="0" value={newPerfume.price10ml} onChange={(e) => setNewPerfume({...newPerfume, price10ml: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none" placeholder="1500" />
          </div>
          <div className="md:col-span-6 flex justify-end mt-2">
             <button type="submit" className="bg-neutral-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-neutral-800 cursor-pointer">Add to Sheet</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
              <th className="p-4 font-semibold text-sm">Perfume Name</th>
              <th className="p-4 font-semibold text-sm">Owner</th>
              <th className="p-4 font-semibold text-sm">Stock (ML)</th>
              <th className="p-4 font-semibold text-sm">5ml Price</th>
              <th className="p-4 font-semibold text-sm">10ml Price</th>
              <th className="p-4 font-semibold text-sm text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50">
                <td className="p-4 font-medium">{item.name}</td>
                <td className="p-4 text-neutral-600">{item.owner}</td>
                <td className="p-4 font-bold text-neutral-800">{item.stockML} ml</td>
                <td className="p-4 text-neutral-600">₱{item.price5ml?.toLocaleString()}</td>
                <td className="p-4 text-neutral-600">₱{item.price10ml?.toLocaleString()}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDelete(item)} className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer" title="Delete Item">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CartView({ cart, removeFromCart, total, checkout }) {
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingCart className="h-12 w-12 text-neutral-400 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Your cart is empty</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">Order Summary</h1>
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
        <ul className="divide-y divide-neutral-100">
          {cart.map(item => (
            <li key={item.id} className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-800">{item.name} ({item.size})</h3>
                <p className="text-xs text-neutral-400">Owner: {item.owner}</p>
                <p className="text-neutral-500 text-sm">₱{item.price.toLocaleString()} x {item.quantity}</p>
              </div>
              <div className="flex items-center space-x-6">
                <span className="font-bold text-lg">₱{(item.price * item.quantity).toLocaleString()}</span>
                <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-red-600 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="bg-neutral-50 p-6 border-t flex justify-between items-center">
          <span className="text-lg font-medium text-neutral-600">Total Amount</span>
          <span className="text-2xl font-bold text-neutral-900">₱{total.toLocaleString()}</span>
        </div>
      </div>
      <button onClick={checkout} className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-900 text-lg font-bold py-4 rounded-xl shadow-sm flex justify-center items-center space-x-2 cursor-pointer transition-colors">
        <Check className="h-6 w-6" /><span>Complete Checkout & Sync Cloud</span>
      </button>
    </div>
  );
}
