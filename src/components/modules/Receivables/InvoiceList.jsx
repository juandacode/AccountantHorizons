import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

const InvoiceList = ({ invoices, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader><CardTitle>Facturas de Venta</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Número</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">F. Emisión</th>
                <th className="text-left p-2">F. Vencim.</th>
                <th className="text-left p-2">Monto</th>
                <th className="text-left p-2">Pagado</th>
                <th className="text-left p-2">Pendiente</th>
                <th className="text-left p-2">Forma Pago</th>
                <th className="text-left p-2">Estado</th>
                <th className="text-left p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <motion.tr 
                  key={invoice.id} 
                  className="border-b hover:bg-gray-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ backgroundColor: "#f9fafb" }}
                >
                  <td className="p-2 font-mono text-sm">{invoice.numero_factura}</td>
                  <td className="p-2 font-medium">{invoice.customerName || invoice.clientes?.nombre_completo}</td>
                  <td className="p-2">{invoice.fecha_emision}</td>
                  <td className="p-2">{invoice.fecha_vencimiento}</td>
                  <td className="p-2">${invoice.monto_total.toFixed(2)}</td>
                  <td className="p-2">${(invoice.monto_pagado || 0).toFixed(2)}</td>
                  <td className="p-2">${(invoice.monto_total - (invoice.monto_pagado || 0)).toFixed(2)}</td>
                  <td className="p-2">{invoice.forma_pago}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${ invoice.estado === 'Pagada' ? 'status-paid' : 'status-pending'}`}>
                      {invoice.estado}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(invoice)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(invoice.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (<div className="text-center py-8 text-gray-500">No hay facturas registradas.</div>)}
        </div>
      </CardContent>
    </Card>
  );
};
export default InvoiceList;