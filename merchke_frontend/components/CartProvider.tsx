"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  /** product id */
  id: number;
  variantId?: number | null;
  name: string;
  price: number;
  image: string;
  quantity: number;
  vendor: string;
  variant?: string;
}

type NewCartItem = Omit<CartItem, "quantity">;

interface CartContextType {
  items: CartItem[];
  addItem: (item: NewCartItem, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const STORAGE_KEY = "merchke_cart";
const CartContext = createContext<CartContextType | null>(null);

/** Two sizes of the same jersey are separate lines. */
export const cartKey = (item: Pick<CartItem, "id" | "variantId">) => `${item.id}:${item.variantId ?? 0}`;

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => typeof i?.id === "number") : [];
  } catch {
    return [];
  }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Restoring the persisted cart after mount avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full / disabled — cart still works for this visit
    }
  }, [items, hydrated]);

  const addItem = (item: NewCartItem, quantity = 1) => {
    const key = cartKey(item);
    setItems((prev) => {
      const exists = prev.find((i) => cartKey(i) === key);
      if (exists) return prev.map((i) => (cartKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i));
      return [...prev, { ...item, quantity }];
    });
  };

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => cartKey(i) !== key));

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) return removeItem(key);
    setItems((prev) => prev.map((i) => (cartKey(i) === key ? { ...i, quantity: qty } : i)));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
