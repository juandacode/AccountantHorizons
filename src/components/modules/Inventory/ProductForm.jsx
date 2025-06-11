
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const ProductForm = ({ isOpen, onOpenChange, onSubmit, editingProduct }) => {
  const [productForm, setProductForm] = useState({
    nombre: '',
    sku: '',
    descripcion: '',
    cantidad_actual: 0
  });

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        nombre: editingProduct.nombre || '',
        sku: editingProduct.sku || '',
        descripcion: editingProduct.descripcion || '',
        cantidad_actual: editingProduct.cantidad_actual || 0
      });
    } else {
      setProductForm({ nombre: '', sku: '', descripcion: '', cantidad_actual: 0 });
    }
  }, [editingProduct, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(productForm);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={productForm.sku}
              onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre del Producto</Label>
            <Input
              id="name"
              value={productForm.nombre}
              onChange={(e) => setProductForm({...productForm, nombre: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={productForm.descripcion}
              onChange={(e) => setProductForm({...productForm, descripcion: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="currentQuantity">Cantidad Inicial</Label>
            <Input
              id="currentQuantity"
              type="number"
              min="0"
              value={productForm.cantidad_actual}
              onChange={(e) => setProductForm({...productForm, cantidad_actual: e.target.value})}
              required
              disabled={!!editingProduct}
            />
          </div>
          <Button type="submit" className="w-full">
            {editingProduct ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
