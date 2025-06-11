
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building, DollarSign, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';

const Payables = () => {
  const [suppliers, setSuppliers] = useLocalStorage('suppliers', []);
  const [invoices, setInvoices] = useLocalStorage('purchase_invoices', []);
  const [payments, setPayments] = useLocalStorage('payable_payments', []);
  
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    supplierId: '',
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

  const handleSupplierSubmit = (e) => {
    e.preventDefault();
    
    if (editingSupplier) {
      setSuppliers(suppliers.map(s => 
        s.id === editingSupplier.id 
          ? { ...supplierForm, id: editingSupplier.id }
          : s
      ));
      toast({
        title: "¡Proveedor actualizado!",
        description: "El proveedor se ha actualizado correctamente.",
      });
    } else {
      const newSupplier = {
        ...supplierForm,
        id: Date.now().toString()
      };
      setSuppliers([...suppliers, newSupplier]);
      toast({
        title: "¡Proveedor agregado!",
        description: "El proveedor se ha registrado correctamente.",
      });
    }
    
    resetSupplierForm();
  };

  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    
    const supplier = suppliers.find(s => s.id === invoiceForm.supplierId);
    if (!supplier) return;

    if (editingInvoice) {
      setInvoices(invoices.map(i => 
        i.id === editingInvoice.id 
          ? { 
              ...invoiceForm, 
              id: editingInvoice.id,
              supplierName: supplier.name,
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
        supplierName: supplier.name,
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
      supplierName: invoice.supplierName,
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

  const resetSupplierForm = () => {
    setSupplierForm({ name: '', email: '', phone: '', address: '' });
    setEditingSupplier(null);
    setIsSupplierDialogOpen(false);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      invoiceNumber: '',
      supplierId: '',
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

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      date: invoice.date,
      amount: invoice.amount,
      description: invoice.description
    });
    setIsInvoiceDialogOpen(true);
  };

  const handleDeleteSupplier = (supplierId) => {
    setSuppliers(suppliers.filter(s => s.id !== supplierId));
    toast({
      title: "Proveedor eliminado",
      description: "El proveedor se ha eliminado correctamente.",
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
  const totalPayable = pendingInvoices.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Cuentas por Pagar</h2>
          <p className="text-gray-600 mt-1">Gestiona proveedores, facturas y pagos realizados</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Pago Realizado</DialogTitle>
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
                          {invoice.invoiceNumber} - {invoice.supplierName} 
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
                  {editingInvoice ? 'Editar Factura' : 'Nueva Factura de Compra'}
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
                  <Label htmlFor="supplierId">Proveedor</Label>
                  <Select value={invoiceForm.supplierId} onValueChange={(value) => 
                    setInvoiceForm({...invoiceForm, supplierId: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
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

          <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Building className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
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
              <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
              <Building className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers.length}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
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
              <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayable.toFixed(2)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
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
          <CardTitle>Facturas de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Número</th>
                  <th className="text-left p-2">Proveedor</th>
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
                    <td className="p-2 font-medium">{invoice.supplierName}</td>
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

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
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
                {suppliers.map(supplier => (
                  <motion.tr 
                    key={supplier.id} 
                    className="border-b hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                  >
                    <td className="p-2 font-medium">{supplier.name}</td>
                    <td className="p-2">{supplier.email}</td>
                    <td className="p-2">{supplier.phone}</td>
                    <td className="p-2">{supplier.address}</td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSupplier(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {suppliers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay proveedores registrados. ¡Agrega tu primer proveedor!
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
                  <th className="text-left p-2">Proveedor</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map(payment => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{payment.date}</td>
                    <td className="p-2 font-mono text-sm">{payment.invoiceNumber}</td>
                    <td className="p-2">{payment.supplierName}</td>
                    <td className="p-2 font-bold text-red-600">${payment.amount.toFixed(2)}</td>
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

export default Payables;
