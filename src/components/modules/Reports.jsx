import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabase } from '@/integrations/supabase/SupabaseProvider';
import { toast } from '@/components/ui/use-toast';

const Reports = () => {
  const { supabase } = useSupabase();
  const [financialSummary, setFinancialSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingReceivables: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
    topExpenseCategories: [],
    recentTransactions: [],
    totalSalesInvoices: 0,
    totalExpensesRecords: 0,
  });

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!supabase) {
        toast({ title: "Advertencia", description: "Supabase no está conectado. Mostrando datos de ejemplo o localStorage si existe.", variant: "default" });
        return;
      }

      try {
        const currentMonth = new Date().getMonth() + 1; 
        const currentYear = new Date().getFullYear();

        const { data: paidSalesInvoices, error: paidSalesError } = await supabase
          .from('facturas_venta')
          .select('monto_total, fecha_emision')
          .eq('estado', 'Pagada');
        if (paidSalesError) throw paidSalesError;
        
        const totalIncome = paidSalesInvoices.reduce((sum, inv) => sum + inv.monto_total, 0);
        const monthlyIncome = paidSalesInvoices
            .filter(inv => new Date(inv.fecha_emision).getMonth() + 1 === currentMonth && new Date(inv.fecha_emision).getFullYear() === currentYear)
            .reduce((sum, inv) => sum + inv.monto_total, 0);


        const { data: expensesData, error: expensesError } = await supabase
          .from('gastos')
          .select('monto, fecha, categoria');
        if (expensesError) throw expensesError;

        const totalExpenses = expensesData.reduce((sum, exp) => sum + exp.monto, 0);
        const monthlyExpenses = expensesData
            .filter(exp => new Date(exp.fecha).getMonth() + 1 === currentMonth && new Date(exp.fecha).getFullYear() === currentYear)
            .reduce((sum, exp) => sum + exp.monto, 0);

        const netProfit = totalIncome - totalExpenses;
        const monthlyProfit = monthlyIncome - monthlyExpenses;

        const { data: pendingSalesInvoices, error: pendingSalesError } = await supabase
          .from('facturas_venta')
          .select('monto_total, monto_pagado')
          .eq('estado', 'Pendiente');
        if (pendingSalesError) throw pendingSalesError;
        const pendingReceivables = pendingSalesInvoices.reduce((sum, inv) => sum + (inv.monto_total - (inv.monto_pagado || 0)), 0);

        const expenseCategories = expensesData.reduce((acc, expense) => {
          acc[expense.categoria] = (acc[expense.categoria] || 0) + expense.monto;
          return acc;
        }, {});
        const topExpenseCategories = Object.entries(expenseCategories)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        const { data: salesInvoicesForCount, error: salesCountError } = await supabase.from('facturas_venta').select('id', { count: 'exact' });
        if (salesCountError) throw salesCountError;
        const totalSalesInvoices = salesInvoicesForCount.length;

        const totalExpensesRecords = expensesData.length;
        
        const { data: recentPayments, error: recentPaymentsError } = await supabase
          .from('pagos_recibidos')
          .select('fecha_pago, monto_pago, facturas_venta(numero_factura)')
          .order('fecha_pago', { ascending: false })
          .limit(5);
        if (recentPaymentsError) throw recentPaymentsError;

        const { data: recentExpenses, error: recentExpensesError } = await supabase
          .from('gastos')
          .select('fecha, monto, descripcion')
          .order('fecha', { ascending: false })
          .limit(5);
        if (recentExpensesError) throw recentExpensesError;

        const combinedTransactions = [
          ...recentPayments.map(p => ({ date: p.fecha_pago, amount: p.monto_pago, type: 'income', description: `Pago Factura ${p.facturas_venta?.numero_factura || ''}`})),
          ...recentExpenses.map(e => ({ date: e.fecha, amount: e.monto, type: 'expense', description: e.descripcion }))
        ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10);


        setFinancialSummary({
          totalIncome,
          totalExpenses,
          netProfit,
          pendingReceivables,
          monthlyIncome,
          monthlyExpenses,
          monthlyProfit,
          topExpenseCategories,
          recentTransactions: combinedTransactions,
          totalSalesInvoices,
          totalExpensesRecords,
        });

      } catch (error) {
        toast({ title: "Error", description: `No se pudieron cargar los datos financieros: ${error.message}`, variant: "destructive" });
      }
    };

    fetchFinancialData();
  }, [supabase]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Informes y Estado de Resultados</h2>
          <p className="text-gray-600 mt-1">Resumen financiero de tu empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialSummary.totalIncome.toFixed(2)}</div>
              <p className="text-xs text-green-100">Facturas pagadas acumuladas</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialSummary.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-red-100">Gastos registrados acumulados</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className={`${financialSummary.netProfit >= 0 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
            : 'bg-gradient-to-r from-orange-500 to-red-600'
          } text-white`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultado Neto</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialSummary.netProfit.toFixed(2)}</div>
              <p className="text-xs opacity-90">
                {financialSummary.netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialSummary.pendingReceivables.toFixed(2)}</div>
              <p className="text-xs text-yellow-100">Facturas pendientes de cobro</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Rendimiento del Mes Actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${financialSummary.monthlyIncome.toFixed(2)}</div>
              <p className="text-sm text-green-700">Ingresos del Mes</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">${financialSummary.monthlyExpenses.toFixed(2)}</div>
              <p className="text-sm text-red-700">Gastos del Mes</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              financialSummary.monthlyProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}>
              <div className={`text-2xl font-bold ${
                financialSummary.monthlyProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                ${financialSummary.monthlyProfit.toFixed(2)}
              </div>
              <p className={`text-sm ${
                financialSummary.monthlyProfit >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                {financialSummary.monthlyProfit >= 0 ? 'Ganancia' : 'Pérdida'} del Mes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {financialSummary.topExpenseCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Principales Categorías de Gastos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialSummary.topExpenseCategories.map(([category, amount], index) => {
                const percentage = financialSummary.totalExpenses > 0 ? ((amount / financialSummary.totalExpenses) * 100).toFixed(1) : '0.0';
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-red-500' :
                        index === 1 ? 'bg-orange-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="font-medium">{category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Descripción</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {financialSummary.recentTransactions.map((transaction, index) => (
                  <motion.tr 
                    key={`${transaction.type}-${index}`}
                    className="border-b hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                  >
                    <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className="p-2">{transaction.description}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className={`p-2 font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </td>
                  </motion.tr>))}
              </tbody>
            </table>
            {financialSummary.recentTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay transacciones recientes.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Estado de Resultados Simplificado (Total)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Ingresos Totales</span>
                  <span className="font-medium text-green-600">+${financialSummary.totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Gastos Totales</span>
                  <span className="font-medium text-red-600">-${financialSummary.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                  <span className="font-semibold text-gray-900">Resultado Neto Total</span>
                  <span className={`font-bold text-lg ${
                    financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${financialSummary.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Indicadores Clave</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700">Margen de Ganancia Neto</div>
                  <div className="text-xl font-bold text-blue-900">
                    {financialSummary.totalIncome > 0 ? ((financialSummary.netProfit / financialSummary.totalIncome) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm text-purple-700">Total Facturas de Venta</div>
                  <div className="text-xl font-bold text-purple-900">{financialSummary.totalSalesInvoices}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-700">Total Registros de Gastos</div>
                  <div className="text-xl font-bold text-orange-900">{financialSummary.totalExpensesRecords}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;