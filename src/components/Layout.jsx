
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Users, 
  CreditCard, 
  Receipt, 
  BarChart3,
  Building2
} from 'lucide-react';

const Layout = ({ children, activeModule, setActiveModule }) => {
  const modules = [
    { id: 'inventory', name: 'Inventario', icon: Package },
    { id: 'receivables', name: 'Cuentas por Cobrar', icon: Users },
    { id: 'payables', name: 'Cuentas por Pagar', icon: CreditCard },
    { id: 'expenses', name: 'Gastos', icon: Receipt },
    { id: 'reports', name: 'Informes', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ContaFácil
                </h1>
                <p className="text-sm text-gray-600">Sistema de Gestión Contable</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64">
            <nav className="space-y-2">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = activeModule === module.id;
                
                return (
                  <motion.button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700 shadow-sm'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="font-medium">{module.name}</span>
                  </motion.button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="animate-fade-in"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
