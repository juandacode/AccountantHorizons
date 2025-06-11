import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building, DollarSign, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/integrations/supabase/SupabaseProvider';
import SupplierForm from '@/components/modules/Payables/SupplierForm';
import PurchaseInvoiceForm from '@/components/modules/Payables/PurchaseInvoiceForm';
import PayablePaymentForm from '@/components/modules/Payables/PayablePaymentForm';
import PurchaseInvoiceList from '@/components/modules/Payables/PurchaseInvoiceList';
import SupplierList from '@/components/modules/Payables/SupplierList';
import RecentPayablePayments from '@/components/modules/Payables/RecentPayablePayments';

const Payables = () => {
  const { supabase } = useSupabase();
  const [suppliers, setSuppliers] = useLocalStorage('suppliers_local', []);
  const [products, setProducts] = useLocalStorage('products_payables_local', []);
  const [invoices, setInvoices] = useLocalStorage('purchase_invoices_local', []);
  const [payments, setPayments] = useLocalStorage('payable_payments_local', []);
  
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'];

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        console.warn("Supabase client not available in Payables. Integration might be incomplete.");
        return;
      }

      const { data: suppliersData, error: suppliersError } = await supabase.from('proveedores').select('*').order('nombre_proveedor');
      if (suppliersError) toast({ title: "Error", description: "No se pudieron cargar los proveedores.", variant: "destructive" });
      else setSuppliers(suppliersData);

      const { data: productsData, error: productsError } = await supabase.from('productos').select('id, nombre, sku, cantidad_actual').order('nombre');
      if (productsError) toast({ title: "Error", description: "No se pudieron cargar los productos para facturación de compra.", variant: "destructive" });
      else setProducts(productsData);

      const { data: invoicesData, error: invoicesError } = await supabase.from('facturas_compra').select('*, proveedores(nombre_proveedor)').order('fecha_emision', { ascending: false });
      if (invoicesError) toast({ title: "Error", description: "No se pudieron cargar las facturas de compra.", variant: "destructive" });
      else setInvoices(invoicesData.map(inv => ({...inv, supplierName: inv.proveedores?.nombre_proveedor || 'N/A'})));
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('pagos_realizados')
        .select('*, facturas_compra(numero_factura, proveedores(nombre_proveedor))')
        .order('fecha_pago', { ascending: false })
        .limit(10);
      if (paymentsError) toast({ title: "Error", description: "No se pudieron cargar los pagos realizados.", variant: "destructive" });
      else setPayments(paymentsData.map(p => ({...p, invoiceNumber: p.facturas_compra?.numero_factura, supplierName: p.facturas_compra?.proveedores?.nombre_proveedor || 'N/A'})));
    };
    fetchData();
  }, [supabase, setSuppliers, setProducts, setInvoices, setPayments]);


  const handleSupplierSubmit = async (supplierData) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    if (editingSupplier) {
      const { data, error } = await supabase
        .from('proveedores')
        .update(supplierData)
        .eq('id', editingSupplier.id)
        .select()
        .single();
      if (error) toast({ title: "Error", description: `No se pudo actualizar el proveedor: ${error.message}`, variant: "destructive" });
      else {
        setSuppliers(prev => prev.map(s => s.id === data.id ? data : s));
        toast({ title: "¡Proveedor actualizado!", description: "El proveedor se ha actualizado correctamente." });
      }
    } else {
      const { data, error } = await supabase.from('proveedores').insert(supplierData).select().single();
      if (error) toast({ title: "Error", description: `No se pudo agregar el proveedor: ${error.message}`, variant: "destructive" });
      else {
        setSuppliers(prev => [data, ...prev]);
        toast({ title: "¡Proveedor agregado!", description: "El proveedor se ha registrado correctamente." });
      }
    }
    setEditingSupplier(null);
    setIsSupplierDialogOpen(false);
  };

  const handleInvoiceSubmit = async (invoiceData, invoiceItems) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    
    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    const invoicePayload = {
      numero_factura: invoiceData.numero_factura,
      proveedor_id: parseInt(invoiceData.proveedor_id),
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
        .from('facturas_compra')
        .update({ ...invoicePayload, estado: editingInvoice.estado, monto_pagado: editingInvoice.monto_pagado })
        .eq('id', editingInvoice.id)
        .select('*, proveedores(nombre_proveedor)')
        .single();

      if (updateError) {
        toast({ title: "Error", description: `No se pudo actualizar la factura de compra: ${updateError.message}`, variant: "destructive" });
        return;
      }
      
      await supabase.from('facturas_compra_detalles').delete().eq('factura_compra_id', editingInvoice.id);
      
      const detailItems = invoiceItems.map(item => ({
        factura_compra_id: updatedInvoice.id,
        producto_id: parseInt(item.producto_id),
        cantidad: parseInt(item.cantidad),
        costo_unitario: parseFloat(item.costo_unitario),
        subtotal: parseFloat(item.subtotal)
      }));

      const { error: detailError } = await supabase.from('facturas_compra_detalles').insert(detailItems);
      if (detailError) {
        toast({ title: "Error", description: `No se pudieron guardar los detalles de la factura de compra: ${detailError.message}`, variant: "destructive" });
        return;
      }
      
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? {...updatedInvoice, supplierName: updatedInvoice.proveedores?.nombre_proveedor || 'N/A'} : i));
      toast({ title: "¡Factura actualizada!", description: "La factura de compra y sus detalles se han actualizado." });

    } else {
      const { data: newInvoice, error: insertError } = await supabase
        .from('facturas_compra')
        .insert(invoicePayload)
        .select('*, proveedores(nombre_proveedor)')
        .single();

      if (insertError) {
        toast({ title: "Error", description: `No se pudo crear la factura de compra: ${insertError.message}`, variant: "destructive" });
        return;
      }

      const detailItems = invoiceItems.map(item => ({
        factura_compra_id: newInvoice.id,
        producto_id: parseInt(item.producto_id),
        cantidad: parseInt(item.cantidad),
        costo_unitario: parseFloat(item.costo_unitario),
        subtotal: parseFloat(item.subtotal)
      }));

      const { error: detailError } = await supabase.from('facturas_compra_detalles').insert(detailItems);
      if (detailError) {
        toast({ title: "Error", description: `No se pudieron guardar los detalles de la factura de compra: ${detailError.message}`, variant: "destructive" });
        await supabase.from('facturas_compra').delete().eq('id', newInvoice.id); 
        return;
      }

      for (const item of invoiceItems) {
        const product = products.find(p => p.id === parseInt(item.producto_id));
        if (product) {
          const newQuantity = product.cantidad_actual + parseInt(item.cantidad);
          await supabase.from('productos').update({ cantidad_actual: newQuantity }).eq('id', product.id);
        }
      }
      const { data: updatedProducts, error: productsError } = await supabase.from('productos').select('id, nombre, sku, cantidad_actual').order('nombre');
      if (!productsError) setProducts(updatedProducts);

      setInvoices(prev => [{...newInvoice, supplierName: newInvoice.proveedores?.nombre_proveedor || 'N/A'}, ...prev]);
      toast({ title: "¡Factura creada!", description: "La factura de compra y sus detalles se han registrado." });
    }
    
    setEditingInvoice(null);
    setIsInvoiceDialogOpen(false);
  };

  const handlePaymentSubmit = async (paymentData) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const invoice = invoices.find(i => i.id === parseInt(paymentData.factura_compra_id));
    if (!invoice) return;

    const paymentAmount = Number(paymentData.monto_pago);
    const newPaidAmount = (invoice.monto_pagado || 0) + paymentAmount;
    
    if (newPaidAmount > invoice.monto_total) {
      toast({ title: "Error", description: "El monto del pago excede el saldo pendiente.", variant: "destructive" });
      return;
    }

    const { error: paymentInsertError } = await supabase.from('pagos_realizados').insert({
      factura_compra_id: parseInt(paymentData.factura_compra_id),
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
      .from('facturas_compra')
      .update({ monto_pagado: newPaidAmount, estado: newStatus })
      .eq('id', parseInt(paymentData.factura_compra_id))
      .select('*, proveedores(nombre_proveedor)')
      .single();

    if (invoiceUpdateError) {
      toast({ title: "Error", description: `No se pudo actualizar la factura de compra: ${invoiceUpdateError.message}`, variant: "destructive" });
    } else {
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? {...updatedInvoice, supplierName: updatedInvoice.proveedores?.nombre_proveedor || 'N/A'} : i));
      const newPaymentEntry = { 
          ...paymentData, 
          id: Date.now(), 
          invoiceNumber: invoice.numero_factura, 
          supplierName: invoice.supplierName 
      };
      setPayments(prev => [newPaymentEntry, ...prev].slice(0,10));
      toast({ title: "¡Pago registrado!", description: "El pago realizado se ha registrado correctamente." });
    }
    setIsPaymentDialogOpen(false);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleEditInvoice = async (invoice) => {
     if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const { data: details, error } = await supabase
      .from('facturas_compra_detalles')
      .select('*, productos(id, nombre, sku)')
      .eq('factura_compra_id', invoice.id);

    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los detalles de la factura de compra: ${error.message}`, variant: "destructive" });
      setEditingInvoice({...invoice, items: []});
    } else {
      const items = details.map(d => ({
        producto_id: d.producto_id,
        productName: d.productos.nombre,
        productSku: d.productos.sku,
        cantidad: d.cantidad,
        costo_unitario: d.costo_unitario,
        subtotal: d.subtotal
      }));
      setEditingInvoice({...invoice, items});
    }
    setIsInvoiceDialogOpen(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('proveedores').delete().eq('id', supplierId);
    if (error) toast({ title: "Error", description: `No se pudo eliminar el proveedor: ${error.message}`, variant: "destructive" });
    else {
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      toast({ title: "Proveedor eliminado", description: "El proveedor se ha eliminado correctamente." });
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos.", variant: "destructive" });
      return;
    }
    await supabase.from('facturas_compra_detalles').delete().eq('factura_compra_id', invoiceId);
    const { error } = await supabase.from('facturas_compra').delete().eq('id', invoiceId);
    if (error) toast({ title: "Error", description: `No se pudo eliminar la factura de compra: ${error.message}`, variant: "destructive" });
    else {
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      toast({ title: "Factura eliminada", description: "La factura de compra se ha eliminado correctamente." });
    }
  };

  const pendingInvoices = invoices.filter(i => i.estado === 'Pendiente');
  const totalPayable = pendingInvoices.reduce((sum, i) => sum + (i.monto_total - (i.monto_pagado || 0)), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.monto_pagado || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cuentas por Pagar</h1>
          <p className="text-gray-600 mt-1">Gestiona proveedores, facturas y pagos realizados</p>
        </div>
        <div className="flex space-x-3">
          <PayablePaymentForm
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onSubmit={handlePaymentSubmit}
            pendingInvoices={pendingInvoices}
          />
          <PurchaseInvoiceForm
            isOpen={isInvoiceDialogOpen}
            onOpenChange={(isOpen) => {
              setIsInvoiceDialogOpen(isOpen);
              if (!isOpen) setEditingInvoice(null);
            }}
            onSubmit={handleInvoiceSubmit}
            editingInvoice={editingInvoice}
            suppliers={suppliers}
            products={products}
            paymentMethods={paymentMethods}
          />
          <SupplierForm
            isOpen={isSupplierDialogOpen}
            onOpenChange={(isOpen) => {
              setIsSupplierDialogOpen(isOpen);
              if (!isOpen) setEditingSupplier(null);
            }}
            onSubmit={handleSupplierSubmit}
            editingSupplier={editingSupplier}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
              <Building className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{suppliers.length}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${totalPayable.toFixed(2)}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingInvoices.length}</div></CardContent>
          </Card>
        </motion.div>
      </div>
      
      <PurchaseInvoiceList
        invoices={invoices}
        onEdit={handleEditInvoice}
        onDelete={handleDeleteInvoice}
      />
      <SupplierList
        suppliers={suppliers}
        onEdit={handleEditSupplier}
        onDelete={handleDeleteSupplier}
      />
      <RecentPayablePayments payments={payments} />
    </div>
  );
};

export default Payables;