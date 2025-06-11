
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, DollarSign, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';

const Receivables = () => {
  const [customers, setCustomers] = useLocalStorage('customers', []);
  const [invoices, setInvoices] = useLocalStorage('sales_invoices', []);
  const [payments, setPayments] = useLocalStorage('receivable_payments', []);
  
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    
    if (editingCustomer) {
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...customerForm, id: editingCustomer.id }
          : c
      ));
      toast({
        title: "¡Cliente actualizado!",
        description: "El cliente se ha actualizado correctamente.",
      });
    } else {
      const newCustomer = {
        ...customerForm,
        id: Date.now().toString()
      };
      setCustomers([...customers, newCustomer]);
      toast({
        title: "¡Cliente agregado!",
        description: "El cliente se ha registrado correctamente.",
      });
    }
    
    resetCustomerForm();
  };

  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    
    const customer = customers.find(c => c.id === invoiceForm.customerId);
    if (!customer) return;

    if (editingInvoice) {
      setInvoices(invoices.map(i => 
        i.id === editingInvoice.id 
          ? { 
              ...invoiceForm, 
              id: editingInvoice.id,
              customerName: customer.name,
              amount: Number(invoiceForm.amount),
              status: editingInvoice.status,
              paidAmount: editingInvoice.paidAmount || 0
            }
          : i
      ));
      toast({
        title: "¡Factura actualizada!",
        description: "La factura se ha actualizado correctamente.",
      });
    } else {
      const newInvoice = {
        ...invoiceForm,
        id: Date.now().toString(),
        customerName: customer.name,
        amount: Number(invoiceForm.amount),
        status: 'Pendiente',
        paidAmount: 0
      };
      setInvoices([...invoices, newInvoice]);
      toast({
        title: "¡Factura creada!",
        description: "La factura se ha registrado correctamente.",
      });
    }
    
    resetInvoiceForm();
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    
    const invoice = invoices.find(i => i.id === paymentForm.invoiceId);
    if (!invoice) return;

    const paymentAmount = Number(paymentForm.amount);
    const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
    
    if (newPaidAmount > invoice.amount) {
      toast({
        title: "Error",
        description: "El monto del pago excede el saldo pendiente.",
        variant: "destructive"
      });
      return;
    }

    // Update invoice
    const newStatus = newPaidAmount >= invoice.amount ? 'Pagada' : 'Pendiente';
    setInvoices(invoices.map(i => 
      i.id === paymentForm.invoiceId 
        ? { ...i, paidAmount: newPaidAmount, status: newStatus }
        : i
    ));

    // Add payment record
    const newPayment = {
      id: Date.now().toString(),
      invoiceId: paymentForm.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: paymentAmount,
      date: paymentForm.date,
      description: paymentForm.description
    };

    setPayments([newPayment, ...payments]);
    
    toast({
      title: "¡Pago registrado!",
      description: "El pago se ha registrado correctamente.",
    });
    
    resetPaymentForm();
  };

  const resetCustomerForm = () => {
    setCustomerForm({ name: '', email: '', phone: '', address: '' });
    setEditingCustomer(null);
    setIsCustomerDialogOpen(false);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      invoiceNumber: '',
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: ''
    });
    setEditingInvoice(null);
    setIsInvoiceDialogOpen(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      invoiceId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsPaymentDialogOpen(false);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      date: invoice.date,
      amount: invoice.amount,
      description: invoice.description
    });
    setIsInvoiceDialogOpen(true);
  };

  const handleDeleteCustomer = (customerId) => {
    setCustomers(customers.filter(c => c.id !== customerId));
    toast({
      title: "Cliente eliminado",
      description: "El cliente se ha eliminado correctamente.",
    });
  };

  const handleDeleteInvoice = (invoiceId) => {
    setInvoices(invoices.filter(i => i.id !== invoiceId));
    toast({
      title: "Factura eliminada",
      description: "La factura se ha eliminado correctamente.",
    });
  };

  const pendingInvoices = invoices.filter(i => i.status === 'Pendiente');
  const totalReceivable = pendingInvoices.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Cuentas por Cobrar</h2>
          <p className="text-gray-600 mt-1">Gestiona clientes, facturas y pagos recibidos</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Pago Recibido</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="invoiceId">Factura</Label>
                  <Select value={paymentForm.invoiceId} onValueChange={(value) => 
                    setPaymentForm({...paymentForm, invoiceId: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar factura" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingInvoices.map(invoice => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - {invoice.customerName} 
                          (Pendiente: ${(invoice.amount - (invoice.paidAmount || 0)).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                    placeholder="Método de pago, referencia, etc."
                  />
                </div>
                <Button type="submit" className="w-full">
                  Registrar Pago
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingInvoice ? 'Editar Factura' : 'Nueva Factura de Venta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="invoiceNumber">Número de Factura</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerId">Cliente</Label>
                  <Select value={invoiceForm.customerId} onValueChange={(value) => 
                    setInvoiceForm({...invoiceForm, customerId: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Monto Total</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                    placeholder="Descripción de productos/servicios"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingInvoice ? 'Actualizar' : 'Crear'} Factura
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Users className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalReceivable.toFixed(2)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvoices.length}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas de Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Número</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Pagado</th>
                  <th className="text-left p-2">Pendiente</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <motion.tr 
                    key={invoice.id} 
                    className="border-b hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                  >
                    <td className="p-2 font-mono text-sm">{invoice.invoiceNumber}</td>
                    <td className="p-2 font-medium">{invoice.customerName}</td>
                    <td className="p-2">{invoice.date}</td>
                    <td className="p-2">${invoice.amount.toFixed(2)}</td>
                    <td className="p-2">${(invoice.paidAmount || 0).toFixed(2)}</td>
                    <td className="p-2">${(invoice.amount - (invoice.paidAmount || 0)).toFixed(2)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        invoice.status === 'Pagada' 
                          ? 'status-paid' 
                          : 'status-pending'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay facturas registradas. ¡Crea tu primera factura!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nombre</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Teléfono</th>
                  <th className="text-left p-2">Dirección</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <motion.tr 
                    key={customer.id} 
                    className="border-b hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                  >
                    <td className="p-2 font-medium">{customer.name}</td>
                    <td className="p-2">{customer.email}</td>
                    <td className="p-2">{customer.phone}</td>
                    <td className="p-2">{customer.address}</td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay clientes registrados. ¡Agrega tu primer cliente!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Factura</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map(payment => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{payment.date}</td>
                    <td className="p-2 font-mono text-sm">{payment.invoiceNumber}</td>
                    <td className="p-2">{payment.customerName}</td>
                    <td className="p-2 font-bold text-green-600">${payment.amount.toFixed(2)}</td>
                    <td className="p-2 text-gray-600">{payment.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay pagos registrados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Receivables;
