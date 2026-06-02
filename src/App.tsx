import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { ShopNoticeProvider } from './components/shop/ShopNoticeProvider'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { useProducts } from './hooks/useProducts'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminAwbPage } from './pages/AdminAwbPage'
import { AdminHomePage } from './pages/AdminHomePage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { GestiunePage } from './pages/GestiunePage'
import { LoginPage } from './pages/LoginPage'
import { CustomerOrdersPage } from './pages/CustomerOrdersPage'
import { OrderSuccessPage } from './pages/OrderSuccessPage'
import { RegisterPage } from './pages/RegisterPage'
import { ShopHomePage } from './pages/ShopHomePage'
import { ProductPage } from './pages/shop/ProductPage'
import {
  ContactInfoPage,
  CookiesInfoPage,
  DeliveryInfoPage,
  FaqInfoPage,
  PrivacyInfoPage,
  ReturnsInfoPage,
  TermsInfoPage,
} from './pages/shop/shopInfoPages'

export default function App() {
  const productApi = useProducts()

  return (
    <AuthProvider>
      {productApi.loading ? (
        <p className="app-status muted" role="status">
          Se încarcă produsele din MySQL…
        </p>
      ) : null}
      {productApi.error ? (
        <p className="app-status app-status--error" role="alert">
          {productApi.error}
        </p>
      ) : null}
      <CartProvider products={productApi.products}>
        <ShopNoticeProvider>
          <Routes>
          <Route
            path="/"
            element={<ShopHomePage products={productApi.products} />}
          />
          <Route
            path="/produs/:productId"
            element={<ProductPage products={productApi.products} />}
          />
          <Route path="/cos" element={<CartPage />} />
          <Route path="/conectare" element={<LoginPage />} />
          <Route path="/inregistrare" element={<RegisterPage />} />
          <Route
            path="/checkout"
            element={
              <CheckoutPage onOrderComplete={productApi.reloadProducts} />
            }
          />
          <Route path="/comanda/:orderId" element={<OrderSuccessPage />} />
          <Route path="/comenzile-mele" element={<CustomerOrdersPage />} />
          <Route path="/livrare-si-plata" element={<DeliveryInfoPage />} />
          <Route path="/retur" element={<ReturnsInfoPage />} />
          <Route path="/contact" element={<ContactInfoPage />} />
          <Route path="/intrebari-frecvente" element={<FaqInfoPage />} />
          <Route path="/termeni-si-conditii" element={<TermsInfoPage />} />
          <Route
            path="/politica-de-confidentialitate"
            element={<PrivacyInfoPage />}
          />
          <Route path="/politica-cookie" element={<CookiesInfoPage />} />
          <Route path="/admin/conectare" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminHomePage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/gestiune"
            element={
              <AdminRoute>
                <GestiunePage {...productApi} />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/comenzi"
            element={
              <AdminRoute>
                <AdminOrdersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/awb"
            element={
              <AdminRoute>
                <AdminAwbPage />
              </AdminRoute>
            }
          />
          <Route path="/gestiune" element={<Navigate to="/admin/gestiune" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ShopNoticeProvider>
      </CartProvider>
    </AuthProvider>
  )
}
