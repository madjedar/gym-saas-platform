"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Package, 
  Search, 
  Tag, 
  Coins,
  RefreshCw
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category: string | null;
};

type CartItem = Product & { quantity: number };

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = ["ALL", ...Array.from(new Set(products.map(p => p.category || "Autre")))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || (p.category || "Autre") === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.stockQuantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          totalAmount: subtotal,
          items: cart.map(c => ({
            productId: c.id,
            quantity: c.quantity,
            unitPrice: c.price
          }))
        }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessOrder({
          total: subtotal,
          itemsCount: cart.reduce((s, i) => s + i.quantity, 0),
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setCart([]);
        // Refresh product stock
        fetchProducts();
      } else {
        alert(data.error || "Échec de l'encaissement");
      }
    } catch (e) {
      alert("Erreur réseau lors de l'encaissement");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      {/* Products Selection Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Point de Vente & Caisse</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Vente directe de suppléments, boissons et équipements.</p>
          </div>

          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Actualiser Stocks
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un produit (Whey, Créatine, Shaker...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-sm">Chargement des articles de la boutique...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              <Package className="w-10 h-10 mb-2 opacity-40 text-zinc-400" />
              <p className="text-sm font-medium">Aucun article trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              {filteredProducts.map(product => {
                const inCart = cart.find(c => c.id === product.id);
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-zinc-900/70 border rounded-2xl p-4 flex flex-col justify-between transition-all select-none ${
                      isOutOfStock
                        ? "border-zinc-800/40 opacity-40 cursor-not-allowed"
                        : inCart
                        ? "border-emerald-500/80 bg-zinc-900/90 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer"
                        : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850 cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                          <Tag className="w-2.5 h-2.5 text-emerald-400" />
                          {product.category || "Boutique"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            product.stockQuantity > 10
                              ? "bg-emerald-500/10 text-emerald-400"
                              : product.stockQuantity > 0
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {product.stockQuantity > 0 ? `${product.stockQuantity} en stock` : "Rupture"}
                        </span>
                      </div>

                      <h3 className="text-white font-medium text-sm leading-snug line-clamp-2 mt-1">
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
                      <div>
                        <p className="text-lg font-black text-emerald-400">
                          {product.price.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-zinc-400">DZD</span>
                        </p>
                      </div>

                      {inCart ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold text-xs">
                          {inCart.quantity}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 flex items-center justify-center text-zinc-300 transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-zinc-900/90 backdrop-blur-xl border-l border-zinc-800 flex flex-col shrink-0 shadow-2xl relative z-20">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">Panier Caisse</h2>
              <p className="text-[11px] text-zinc-500 mt-1">{cart.length} articles sélectionnés</p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Vider
            </button>
          )}
        </div>

        {/* Cart List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <ShoppingCart className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Le panier est vide</p>
              <p className="text-xs text-zinc-600 mt-1">
                Cliquez sur un produit à gauche pour l'ajouter à la commande.
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{item.name}</p>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    {item.price.toLocaleString()} DZD
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Checkout Button */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950/90">
          <div className="space-y-2 mb-4 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Articles ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span>{subtotal.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Mode de Paiement</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Coins className="w-3 h-3" /> Espèces (Caisse)
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Total à Payer</span>
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {subtotal.toLocaleString()} <span className="text-xs font-normal text-zinc-400">DZD</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isCheckingOut ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validation de la vente...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Encaisser ({subtotal.toLocaleString()} DZD)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Receipt Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Vente Validée !</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Le stock a été décrémenté et la transaction a été enregistrée en caisse.
            </p>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Heure d'encaissement</span>
                <span className="text-white font-medium">{successOrder.date}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Quantité d'articles</span>
                <span className="text-white font-medium">{successOrder.itemsCount} pièces</span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-2 border-t border-zinc-800">
                <span className="font-bold text-white">Montant Encaissé</span>
                <span className="font-black text-emerald-400 text-sm">
                  {successOrder.total.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessOrder(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all"
            >
              Nouvelle Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
