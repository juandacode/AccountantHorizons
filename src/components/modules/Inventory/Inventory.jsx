import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/integrations/supabase/SupabaseProvider';
import ProductForm from '@/components/modules/Inventory/ProductForm';
import MovementForm from '@/components/modules/Inventory/MovementForm';
import ProductList from '@/components/modules/Inventory/ProductList';
import RecentMovements from '@/components/modules/Inventory/RecentMovements';
import LowStockAlert from '@/components/modules/Inventory/LowStockAlert';


const Inventory = () => {
  const { supabase } = useSupabase();
  const [products, setProducts] = useLocalStorage('products_local', []);
  const [movements, setMovements] = useLocalStorage('inventory_movements_local', []);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!supabase) {
        console.warn("Supabase client not available in Inventory for products. Integration might be incomplete.");
        return;
      }
      const { data, error } = await supabase.from('productos').select('*').order('nombre');
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los productos.", variant: "destructive" });
      } else {
        setProducts(data);
      }
    };
    const fetchMovements = async () => {
      if (!supabase) {
        console.warn("Supabase client not available in Inventory for movements. Integration might be incomplete.");
        return;
      }
      const { data, error } = await supabase.from('movimientos_inventario').select('*, productos(nombre)').order('fecha_movimiento', { ascending: false }).limit(10);
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" });
      } else {
        setMovements(data.map(m => ({...m, productName: m.productos?.nombre || 'N/A'})));
      }
    };

    fetchProducts();
    fetchMovements();
  }, [supabase, setProducts, setMovements]);

  const handleProductSubmit = async (productData) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    if (editingProduct) {
      const { data, error } = await supabase
        .from('productos')
        .update({ ...productData, cantidad_actual: Number(productData.cantidad_actual) })
        .eq('id', editingProduct.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Error", description: `No se pudo actualizar el producto: ${error.message}`, variant: "destructive" });
      } else {
        setProducts(prev => prev.map(p => p.id === data.id ? data : p));
        toast({ title: "¡Producto actualizado!", description: "El producto se ha actualizado correctamente." });
      }
    } else {
      const { data, error } = await supabase
        .from('productos')
        .insert({ ...productData, cantidad_actual: Number(productData.cantidad_actual) })
        .select()
        .single();
      if (error) {
        toast({ title: "Error", description: `No se pudo agregar el producto: ${error.message}`, variant: "destructive" });
      } else {
        setProducts(prev => [data, ...prev]);
        toast({ title: "¡Producto agregado!", description: "El producto se ha registrado correctamente." });
      }
    }
    setEditingProduct(null);
    setIsProductDialogOpen(false);
  };

  const handleMovementSubmit = async (movementData) => {
     if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    const product = products.find(p => p.id === parseInt(movementData.producto_id));
    if (!product) {
        toast({ title: "Error", description: "Producto no encontrado para el movimiento.", variant: "destructive" });
        return;
    }

    const quantity = Number(movementData.cantidad);
    const newQuantity = movementData.tipo_movimiento === 'entrada' 
      ? product.cantidad_actual + quantity
      : product.cantidad_actual - quantity;

    if (newQuantity < 0) {
      toast({ title: "Error", description: "No hay suficiente stock para esta salida.", variant: "destructive" });
      return;
    }

    const { error: movementError } = await supabase
      .from('movimientos_inventario')
      .insert({
        producto_id: parseInt(movementData.producto_id),
        tipo_movimiento: movementData.tipo_movimiento,
        cantidad: quantity,
        descripcion_movimiento: movementData.descripcion_movimiento,
        fecha_movimiento: new Date().toISOString(),
        cantidad_anterior: product.cantidad_actual,
        cantidad_nueva: newQuantity
      });

    if (movementError) {
      toast({ title: "Error", description: `No se pudo registrar el movimiento: ${movementError.message}`, variant: "destructive" });
      return;
    }

    const { data: updatedProduct, error: productUpdateError } = await supabase
      .from('productos')
      .update({ cantidad_actual: newQuantity })
      .eq('id', parseInt(movementData.producto_id))
      .select()
      .single();

    if (productUpdateError) {
      toast({ title: "Error", description: `No se pudo actualizar el stock del producto: ${productUpdateError.message}`, variant: "destructive" });
    } else {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      const newMovementEntry = {
        ...movementData,
        id: Date.now(), 
        productName: product.nombre,
        fecha_movimiento: new Date().toISOString().split('T')[0],
        cantidad_anterior: product.cantidad_actual,
        cantidad_nueva: newQuantity
      };
      setMovements(prev => [newMovementEntry, ...prev].slice(0,10));
      toast({ title: "¡Movimiento registrado!", description: `${movementData.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'} registrada.` });
    }
    setIsMovementDialogOpen(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!supabase) {
      toast({ title: "Error de conexión", description: "No se puede conectar a la base de datos. Por favor, completa la integración de Supabase.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('productos').delete().eq('id', productId);
    if (error) {
      toast({ title: "Error", description: `No se pudo eliminar el producto: ${error.message}`, variant: "destructive" });
    } else {
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast({ title: "Producto eliminado", description: "El producto se ha eliminado correctamente." });
    }
  };

  const lowStockProducts = products.filter(p => p.cantidad_actual <= 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-gray-600 mt-1">Administra tus productos y movimientos de stock</p>
        </div>
        <div className="flex space-x-3">
          <MovementForm
            isOpen={isMovementDialogOpen}
            onOpenChange={setIsMovementDialogOpen}
            onSubmit={handleMovementSubmit}
            products={products}
          />
          <ProductForm
            isOpen={isProductDialogOpen}
            onOpenChange={(isOpen) => {
              setIsProductDialogOpen(isOpen);
              if (!isOpen) setEditingProduct(null);
            }}
            onSubmit={handleProductSubmit}
            editingProduct={editingProduct}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + (p.cantidad_actual || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="card-hover">
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <TrendingDown className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <LowStockAlert lowStockProducts={lowStockProducts} />
      <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} />
      <RecentMovements movements={movements} />
    </div>
  );
};

export default Inventory;