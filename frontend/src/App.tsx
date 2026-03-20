import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// Auth pages
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Onboarding from '@/pages/Onboarding'

// Dashboard
import Dashboard from '@/pages/Dashboard'

// Inventory
import InventoryList from '@/pages/inventory/InventoryList'
import RestockPlanner from '@/pages/inventory/RestockPlanner'
import SizeIntelligence from '@/pages/inventory/SizeIntelligence'
import ProductDetail from '@/pages/inventory/ProductDetail'

// Finance
import FinanceDashboard from '@/pages/finance/FinanceDashboard'
import CodTracking from '@/pages/finance/CodTracking'
import Expenses from '@/pages/finance/Expenses'
import Profitability from '@/pages/finance/Profitability'
import FinanceSettings from '@/pages/finance/FinanceSettings'

// Marketing
import MarketingDashboard from '@/pages/marketing/MarketingDashboard'
import Campaigns from '@/pages/marketing/Campaigns'
import Creatives from '@/pages/marketing/Creatives'
import Attribution from '@/pages/marketing/Attribution'
import BeroasCalculator from '@/pages/marketing/BeroasCalculator'

// Operations
import OperationsDashboard from '@/pages/operations/OperationsDashboard'
import Orders from '@/pages/operations/Orders'
import Returns from '@/pages/operations/Returns'
import FailedDeliveries from '@/pages/operations/FailedDeliveries'

// POS
import PosInterface from '@/pages/pos/PosInterface'
import BazaarEvents from '@/pages/pos/BazaarEvents'
import EventDetail from '@/pages/pos/EventDetail'
import PosHistory from '@/pages/pos/PosHistory'
import PosOrderDetail from '@/pages/pos/PosOrderDetail'

// Other
import Insights from '@/pages/Insights'
import Integrations from '@/pages/settings/Integrations'
import BrandSettings from '@/pages/settings/BrandSettings'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<RequireGuest><AuthLayout /></RequireGuest>}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Onboarding */}
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

      {/* Dashboard routes */}
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />

        {/* Inventory */}
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/inventory/restock-planner" element={<RestockPlanner />} />
        <Route path="/inventory/size-intelligence" element={<SizeIntelligence />} />
        <Route path="/inventory/:id" element={<ProductDetail />} />

        {/* Finance */}
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/finance/cod" element={<CodTracking />} />
        <Route path="/finance/expenses" element={<Expenses />} />
        <Route path="/finance/profitability" element={<Profitability />} />
        <Route path="/finance/settings" element={<FinanceSettings />} />

        {/* Marketing */}
        <Route path="/marketing" element={<MarketingDashboard />} />
        <Route path="/marketing/campaigns" element={<Campaigns />} />
        <Route path="/marketing/creatives" element={<Creatives />} />
        <Route path="/marketing/attribution" element={<Attribution />} />
        <Route path="/marketing/beroas" element={<BeroasCalculator />} />

        {/* Operations */}
        <Route path="/operations" element={<OperationsDashboard />} />
        <Route path="/operations/orders" element={<Orders />} />
        <Route path="/operations/returns" element={<Returns />} />
        <Route path="/operations/failed-deliveries" element={<FailedDeliveries />} />

        {/* POS */}
        <Route path="/pos" element={<PosInterface />} />
        <Route path="/pos/events" element={<BazaarEvents />} />
        <Route path="/pos/events/:id" element={<EventDetail />} />
        <Route path="/pos/history" element={<PosHistory />} />
        <Route path="/pos/orders/:id" element={<PosOrderDetail />} />

        {/* Insights */}
        <Route path="/insights" element={<Insights />} />

        {/* Settings */}
        <Route path="/settings/integrations" element={<Integrations />} />
        <Route path="/settings/brand" element={<BrandSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
