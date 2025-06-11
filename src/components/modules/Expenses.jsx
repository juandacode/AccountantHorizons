
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Receipt, DollarSign, Calendar, Tag, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/integrations/supabase/SupabaseProvider';


const Expenses = () => {
  const { supabase } = useSupabase();
  const [expenses, setExpenses] = useLocalStorage('expenses_local', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    categoria: '',
    monto: 0
  });

  const categories = [
    'Oficina y Administración',
    'Marketing y Publicidad',
    'Servicios Públicos',
    'Transporte',
    'Alimentación',
    'Tecnología',
    'Mantenimiento',
    'Seguros',
    'Impuestos',
    'Otros'
  ];

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los gastos.", variant: "destructive" });
      } else {
        setExpenses(data);
      }
    };
    fetchExpenses();
  }, [supabase, setExpenses]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }

    const expenseData = {
      fecha: expenseForm.fecha,
      descripcion: expenseForm.descripcion,
      categoria: expenseForm.categoria,
      monto: Number(expenseForm.monto)
    };

    if (editingExpense) {
      const { data, error } = await supabase
        .from('gastos')
        .update(expenseData)
        .eq('id', editingExpense.id)
        .select()
        .single();
      
      if (error) {
        toast({ title: "Error", description: "No se pudo actualizar el gasto.", variant: "destructive" });
      } else {
        setExpenses(prevExpenses => prevExpenses.map(exp => (exp.id === data.id ? data : exp)));
        toast({ title: "¡Gasto actualizado!", description: "El gasto se ha actualizado correctamente." });
      }
    } else {
      const { data, error } = await supabase
        .from('gastos')
        .insert(expenseData)
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "No se pudo registrar el gasto.", variant: "destructive" });
      } else {
        setExpenses(prevExpenses => [data, ...prevExpenses]);
        toast({ title: "¡Gasto registrado!", description: "El gasto se ha registrado correctamente." });
      }
    }
    
    resetForm();
  };

  const resetForm = () => {
    setExpenseForm({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      categoria: '',
      monto: 0
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      fecha: expense.fecha,
      descripcion: expense.descripcion,
      categoria: expense.categoria,
      monto: expense.monto
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (expenseId) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('gastos').delete().eq('id', expenseId);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el gasto.", variant: "destructive" });
    } else {
      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
      toast({ title: "Gasto eliminado", description: "El gasto se ha eliminado correctamente." });
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.monto, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter(exp => {
    const expenseDate = new Date(exp.fecha);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  }).reduce((sum, exp) => sum + exp.monto, 0);

  const expensesByCategory = categories.map(category => ({
    category,
    total: expenses.filter(exp => exp.categoria === category).reduce((sum, exp) => sum + exp.monto, 0),
    count: expenses.filter(exp => exp.categoria === category).length
  })).filter(item => item.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Gastos</h2>
          <p className="text-gray-600 mt-1">Registra y controla todos los gastos de tu empresa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={expenseForm.fecha}
                  onChange={(e) => setExpenseForm({...expenseForm, fecha: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={expenseForm.descripcion}
                  onChange={(e) => setExpenseForm({...expenseForm, descripcion: e.target.value})}
                  placeholder="Describe el gasto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoría</Label>
                <Select value={expenseForm.categoria} onValueChange={(value) => 
                  setExpenseForm({...expenseForm, categoria: value})
                } required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseForm.monto}
                  onChange={(e) => setExpenseForm({...expenseForm, monto: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingExpense ? 'Actualizar' : 'Registrar'} Gasto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
              <Calendar className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${monthlyExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
              <Receipt className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {expensesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expensesByCategory.map(item => (
                <motion.div 
                  key={item.category}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.category}</p>
                      <p className="text-sm text-gray-600">{item.count} gastos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Descripción</th>
                  <th className="text-left p-2">Categoría</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <motion.tr 
                    key={expense.id} 
                    className="border-b hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                  >
                    <td className="p-2">{expense.fecha}</td>
                    <td className="p-2 font-medium">{expense.descripcion}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {expense.categoria}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-red-600">${expense.monto.toFixed(2)}</td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay gastos registrados. ¡Registra tu primer gasto!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
