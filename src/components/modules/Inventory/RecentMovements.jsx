
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RecentMovements = ({ movements }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Producto</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Cantidad</th>
                <th className="text-left p-2">Stock Anterior</th>
                <th className="text-left p-2">Stock Nuevo</th>
                <th className="text-left p-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(movement => (
                <tr key={movement.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{new Date(movement.fecha_movimiento).toLocaleDateString()}</td>
                  <td className="p-2 font-medium">{movement.productName || movement.productos?.nombre}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      movement.tipo_movimiento === 'entrada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {movement.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="p-2">{movement.cantidad}</td>
                  <td className="p-2">{movement.cantidad_anterior}</td>
                  <td className="p-2 font-bold">{movement.cantidad_nueva}</td>
                  <td className="p-2 text-gray-600">{movement.descripcion_movimiento}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay movimientos registrados.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentMovements;
