import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, DollarSign, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/integrations/supabase/SupabaseProvider';
import CustomerForm from '@/components/modules/Receivables/CustomerForm';
import InvoiceForm from '@/components/modules/Receivables/InvoiceForm';
import PaymentForm from '@/components/modules/Receivables/PaymentForm';
import InvoiceList from '@/components/modules/Receivables/InvoiceList';
import CustomerList from '@/components/modules/Receivables/CustomerList';
import RecentPayments from '@/components/modules/Receivables/RecentPayments';

const Receivables = () => {
  const { supabase } = useSupabase();
  const [customers, setCustomers] = useLocalStorage('customers_local', []);
  const [products, setProducts] = useLocalStorage('products_receivables_local', []);
  const [invoices, setInvoices] = useLocalStorage('sales_invoices_local', []);
  const [payments, setPayments] = useLocalStorage('receivable_payments_local', []);
  
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'];

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        console.warn("Supabase client not available in Receivables. Integration might be incomplete.");
        return;
      }

      const { data: customersData, error: customersError } = await supabase.from('clientes').select('*').order('nombre_completo');
      if (customersError) toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" });
      else setCustomers(customersData);

      const { data: productsData, error: productsError } = await supabase.from('productos').select('id, nombre, sku, cantidad_actual').order('nombre');
      if (productsError) toast({ title: "Error", description: "No se pudieron cargar los productos para facturación.", variant: "destructive" });
      else setProducts(productsData);

      const { data: invoicesData, error: invoicesError } = await supabase.from('facturas_venta').select('*, clientes(nombre_completo)').order('fecha_emision', { ascending: false });
      if (invoicesError) toast({ title: "Error", description: "No se pudieron cargar las facturas de venta.", variant: "destructive" });
      else setInvoices(invoicesData.map(inv => ({...inv, customerName: inv.clientes?.nombre_completo || 'N/A'})));
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('pagos_recibidos')
        .select('*, facturas_venta(numero_factura, clientes(nombre_completo))')
        .order('fecha_pago', { ascending: false })
        .limit(10);
      if (paymentsError) toast({ title: "Error", description: "No se pudieron cargar los pagos recibidos.", variant: "destructive" });
      else setPayments(paymentsData.map(p => ({...p, invoiceNumber: p.facturas_venta?.numero_factura, customerName: p.facturas_venta?.clientes?.nombre_completo || 'N/A'})));
    };
    fetchData();
  }, [supabase, setCustomers, setProducts, setInvoices, setPayments]);

  const handleCustomerSubmit = async (customerData) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    if (editingCustomer) {
      const { data, error } = await supabase
        .from('clientes')
        .update(customerData)
        .eq('id', editingCustomer.id)
        .select()
        .single();
      if (error) toast({ title: "Error", description: `No se pudo actualizar el cliente: ${error.message}`, variant: "destructive" });
      else {
        setCustomers(prev => prev.map(c => c.id === data.id ? data : c));
        toast({ title: "¡Cliente actualizado!", description: "El cliente se ha actualizado correctamente." });
      }
    } else {
      const { data, error } = await supabase.from('clientes').insert(customerData).select().single();
      if (error) toast({ title: "Error", description: `No se pudo agregar el cliente: ${error.message}`, variant: "destructive" });
      else {
        setCustomers(prev => [data, ...prev]);
        toast({ title: "¡Cliente agregado!", description: "El cliente se ha registrado correctamente." });
      }
    }
    setEditingCustomer(null);
    setIsCustomerDialogOpen(false);
  };

  const handleInvoiceSubmit = async (invoiceData, invoiceItems) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    
    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    const invoicePayload = {
      numero_factura: invoiceData.numero_factura,
      cliente_id: parseInt(invoiceData.cliente_id),
      fecha_emision: invoiceData.fecha_emision,
      fecha_vencimiento: invoiceData.fecha_vencimiento || null,
      monto_total: totalAmount,
      forma_pago: invoiceData.forma_pago,
      descripcion_factura: invoiceData.descripcion_factura,
      estado: 'Pendiente',
      monto_pagado: 0
    };

    if (editingInvoice) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('facturas_venta')
        .update({ ...invoicePayload, estado: editingInvoice.estado, monto_pagado: editingInvoice.monto_pagado })
        .eq('id', editingInvoice.id)
        .select('*, clientes(nombre_completo)')
        .single();

      if (updateError) {
        toast({ title: "Error", description: `No se pudo actualizar la factura: ${updateError.message}`, variant: "destructive" });
        return;
      }
      
      await supabase.from('facturas_venta_detalles').delete().eq('factura_venta_id', editingInvoice.id);
      
      const detailItems = invoiceItems.map(item => ({
        factura_venta_id: updatedInvoice.id,
        producto_id: parseInt(item.producto_id),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        subtotal: parseFloat(item.subtotal)
      }));

      const { error: detailError } = await supabase.from('facturas_venta_detalles').insert(detailItems);
      if (detailError) {
        toast({ title: "Error", description: `No se pudieron guardar los detalles de la factura: ${detailError.message}`, variant: "destructive" });
        return;
      }
      
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? {...updatedInvoice, customerName: updatedInvoice.clientes?.nombre_completo || 'N/A'} : i));
      toast({ title: "¡Factura actualizada!", description: "La factura y sus detalles se han actualizado." });

    } else {
      const { data: newInvoice, error: insertError } = await supabase
        .from('facturas_venta')
        .insert(invoicePayload)
        .select('*, clientes(nombre_completo)')
        .single();

      if (insertError) {
        toast({ title: "Error", description: `No se pudo crear la factura: ${insertError.message}`, variant: "destructive" });
        return;
      }

      const detailItems = invoiceItems.map(item => ({
        factura_venta_id: newInvoice.id,
        producto_id: parseInt(item.producto_id),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        subtotal: parseFloat(item.subtotal)
      }));

      const { error: detailError } = await supabase.from('facturas_venta_detalles').insert(detailItems);
      if (detailError) {
        toast({ title: "Error", description: `No se pudieron guardar los detalles de la factura: ${detailError.message}`, variant: "destructive" });
        await supabase.from('facturas_venta').delete().eq('id', newInvoice.id); 
        return;
      }

      for (const item of invoiceItems) {
        const product = products.find(p => p.id === parseInt(item.producto_id));
        if (product) {
          const newQuantity = product.cantidad_actual - parseInt(item.cantidad);
          await supabase.from('productos').update({ cantidad_actual: newQuantity }).eq('id', product.id);
        }
      }
      const { data: updatedProducts, error: productsError } = await supabase.from('productos').select('id, nombre, sku, cantidad_actual').order('nombre');
      if (!productsError) setProducts(updatedProducts);


      setInvoices(prev => [{...newInvoice, customerName: newInvoice.clientes?.nombre_completo || 'N/A'}, ...prev]);
      toast({ title: "¡Factura creada!", description: "La factura y sus detalles se han registrado." });
    }
    
    setEditingInvoice(null);
    setIsInvoiceDialogOpen(false);
  };

  const handlePaymentSubmit = async (paymentData) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const invoice = invoices.find(i => i.id === parseInt(paymentData.factura_venta_id));
    if (!invoice) return;

    const paymentAmount = Number(paymentData.monto_pago);
    const newPaidAmount = (invoice.monto_pagado || 0) + paymentAmount;
    
    if (newPaidAmount > invoice.monto_total) {
      toast({ title: "Error", description: "El monto del pago excede el saldo pendiente.", variant: "destructive" });
      return;
    }

    const { error: paymentInsertError } = await supabase.from('pagos_recibidos').insert({
      factura_venta_id: parseInt(paymentData.factura_venta_id),
      fecha_pago: paymentData.fecha_pago,
      monto_pago: paymentAmount,
      descripcion_pago: paymentData.descripcion_pago,
    });

    if (paymentInsertError) {
       toast({ title: "Error", description: `No se pudo registrar el pago: ${paymentInsertError.message}`, variant: "destructive" });
       return;
    }

    const newStatus = newPaidAmount >= invoice.monto_total ? 'Pagada' : 'Pendiente';
    const { data: updatedInvoice, error: invoiceUpdateError } = await supabase
      .from('facturas_venta')
      .update({ monto_pagado: newPaidAmount, estado: newStatus })
      .eq('id', parseInt(paymentData.factura_venta_id))
      .select('*, clientes(nombre_completo)')
      .single();

    if (invoiceUpdateError) {
      toast({ title: "Error", description: `No se pudo actualizar la factura: ${invoiceUpdateError.message}`, variant: "destructive" });
    } else {
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? {...updatedInvoice, customerName: updatedInvoice.clientes?.nombre_completo || 'N/A'} : i));
      const newPaymentEntry = { 
          ...paymentData, 
          id: Date.now(), 
          invoiceNumber: invoice.numero_factura, 
          customerName: invoice.customerName 
      };
      setPayments(prev => [newPaymentEntry, ...prev].slice(0,10));
      toast({ title: "¡Pago registrado!", description: "El pago se ha registrado correctamente." });
    }
    setIsPaymentDialogOpen(false);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleEditInvoice = async (invoice) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const { data: details, error } = await supabase
      .from('facturas_venta_detalles')
      .select('*, productos(id, nombre, sku)')
      .eq('factura_venta_id', invoice.id);

    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los detalles de la factura: ${error.message}`, variant: "destructive" });
      setEditingInvoice({...invoice, items: []});
    } else {
      const items = details.map(d => ({
        producto_id: d.producto_id,
        productName: d.productos.nombre,
        productSku: d.productos.sku,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      }));
      setEditingInvoice({...invoice, items});
    }
    setIsInvoiceDialogOpen(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('clientes').delete().eq('id', customerId);
    if (error) toast({ title: "Error", description: `No se pudo eliminar el cliente: ${error.message}`, variant: "destructive" });
    else {
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      toast({ title: "Cliente eliminado", description: "El cliente se ha eliminado correctamente." });
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
     if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    await supabase.from('facturas_venta_detalles').delete().eq('factura_venta_id', invoiceId);
    const { error } = await supabase.from('facturas_venta').delete().eq('id', invoiceId);
    if (error) toast({ title: "Error", description: `No se pudo eliminar la factura: ${error.message}`, variant: "destructive" });
    else {
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      toast({ title: "Factura eliminada", description: "La factura se ha eliminado correctamente." });
    }
  };

  const pendingInvoices = invoices.filter(i => i.estado === 'Pendiente');
  const totalReceivable = pendingInvoices.reduce((sum, i) => sum + (i.monto_total - (i.monto_pagado || 0)), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.monto_pagado || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cuentas por Cobrar</h1>
          <p className="text-gray-600 mt-1">Gestiona clientes, facturas y pagos recibidos</p>
        </div>
        <div className="flex space-x-3">
          <PaymentForm 
            isOpen={isPaymentDialogOpen} 
            onOpenChange={setIsPaymentDialogOpen}
            onSubmit={handlePaymentSubmit}
            pendingInvoices={pendingInvoices}
          />
          <InvoiceForm
            isOpen={isInvoiceDialogOpen}
            onOpenChange={(isOpen) => {
              setIsInvoiceDialogOpen(isOpen);
              if (!isOpen) setEditingInvoice(null);
            }}
            onSubmit={handleInvoiceSubmit}
            editingInvoice={editingInvoice}
            customers={customers}
            products={products}
            paymentMethods={paymentMethods}
          />
          <CustomerForm
            isOpen={isCustomerDialogOpen}
            onOpenChange={(isOpen) => {
              setIsCustomerDialogOpen(isOpen);
              if (!isOpen) setEditingCustomer(null);
            }}
            onSubmit={handleCustomerSubmit}
            editingCustomer={editingCustomer}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{customers.length}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${totalReceivable.toFixed(2)}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingInvoices.length}</div></CardContent>
          </Card>
        </motion.div>
      </div>

      <InvoiceList 
        invoices={invoices} 
        onEdit={handleEditInvoice} 
        onDelete={handleDeleteInvoice}
      />
      <CustomerList 
        customers={customers}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />
      <RecentPayments payments={payments} />
    </div>
  );
};

export default Receivables;