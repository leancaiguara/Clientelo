const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Clientes");
const Pedido = require("../models/Pedido");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Clientes = require("../models/Clientes");
const { findByIdAndUpdate, findOneAndUpdate } = require("../models/Usuario");
require("dotenv").config();

const crearToken = (usuario, secreto, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;
  return jwt.sign({ id }, secreto, { expiresIn });
};

const resolvers = {
  Query: {
    obtenerUsuario: async (_, { token }) => {
      const usuarioId = await jwt.verify(token, process.env.SECRETO);

      return usuarioId;
    },

    obtenerProducto: async () => {
      try {
        const productos = await Producto.find();

        return productos;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerUnProducto: async (_, { id }) => {
      try {
        const producto = await Producto.findById(id);
        if (!producto) throw new Error("Producto no encontrado");
        return producto;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerCliente: async () => {
      try {
        const clientes = await Cliente.find();

        return clientes;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
        return clientes;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerUnCliente: async (_, { id }, ctx) => {
      try {
        //verificamos que el cliente exista
        const cliente = await Cliente.findById(id);
        if (!cliente) throw new Error("Cliente no encontrado");

        //verificamos que sea el cliente del vendedors
        if (cliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error("Permiso denegado");
        }
        //retornamos cliente
        return cliente;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
        return pedidos;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerUnPedido: async (_, { id }, ctx) => {
      try {
        const pedido = await Pedido.findById(id);
        if (!pedido) throw new Error("Pedido no encontrado");

        if (pedido.vendedor.toString() !== ctx.usuario.id) throw new Error("Permiso denegado");

        return pedido;
      } catch (err) {
        console.log(err);
      }
    },

    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
      return pedidos;
    },

    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $limit: 10,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clientes;
    },

    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },

    buscarProducto: async (_, { texto }) => {
      const productos = Producto.find({ $text: { $search: texto } }).limit(12);

      return productos;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;
      //revisar si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) throw new Error("El usuario ya esta conectado");
      //hashear su password
      input.password = await bcrypt.hash(password, 12);

      //guardarlo en la base de datos
      try {
        const usuario = await Usuario.create(input);

        return usuario;
      } catch (err) {
        console.log(err);
      }
    },

    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;

      //si el usuario existe
      const usuario = await Usuario.findOne({ email });
      if (!usuario) throw new Error("El usuario no existe");

      //revisar si el password es correcto
      const match = await bcrypt.compare(password, usuario.password);
      if (!match) throw new Error("La contraseña es incorrecta");

      //crear token
      return {
        token: crearToken(usuario, process.env.SECRETO, "24h"),
      };
    },

    nuevoProducto: async (_, { input }) => {
      try {
        const productoNuevo = await Producto.create(input);
        return productoNuevo;
      } catch (err) {
        console.log(err);
      }
    },

    actualizarProducto: async (_, { id, input }) => {
      try {
        let producto = await Producto.findById(id);
        if (!producto) throw new Error("Producto no encontrado");

        producto = await Producto.findOneAndUpdate({ _id: id }, input, {
          new: true,
        });
        return producto;
      } catch (err) {
        console.log(err);
      }
    },

    eliminarProducto: async (_, { id }) => {
      try {
        let producto = await Producto.findById(id);
        if (!producto) throw new Error("Producto no encontrado");

        await Producto.findOneAndDelete({ _id: id });
        return "Producto eliminado";
      } catch (err) {
        console.log(err);
      }
    },

    nuevoCliente: async (_, { input }, ctx) => {
      const { email } = input;
      //Verificamos que el cliente ya no este registrado
      let cliente = await Cliente.findOne({ email });
      if (cliente) throw new Error("Este cliente ya esta registrado");

      //registramos el nuevo cliente
      const newCliente = new Cliente(input);

      //le asignamos el id del vendedor que lo registro
      newCliente.vendedor = ctx.usuario.id;
      try {
        //guardamos al cliente en la base de de datos
        const resultado = await newCliente.save();

        // retornamos el cliente;
        return resultado;
      } catch (err) {
        console.log(err);
      }
    },

    actualizarCliente: async (_, { id, input }, ctx) => {
      try {
        //verificamos si el cliente existe
        let cliente = await Cliente.findById(id);
        if (!cliente) throw new Error("Cliente no encontrado");

        //verificamos que sea el cliente del vendedor
        if (cliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error("Permiso denegado");
        }
        //guardar el cliente
        cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true });

        return cliente;
      } catch (err) {
        console.log(err);
      }
    },

    eliminarCliente: async (_, { id }, ctx) => {
      try {
        //verificamos que el cliente exista
        const cliente = await Cliente.findById(id);
        if (!cliente) throw new Error("Cliente no encontrado");

        //verificamos que el cliente sea del vendedor logueado
        if (cliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error("Permiso denegado");
        }
        //eliminamos el usuario
        await Cliente.findByIdAndDelete(id);

        return "Cliente eliminado";
      } catch (err) {
        console.log(err);
      }
    },

    nuevoPedido: async (_, { input }, ctx) => {
      //verificar si existe el cliente

      console.log("lpm", input);
      console.log("contexto", ctx);
      const { cliente } = input;
      let clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) throw new Error("Cliente no encontrado");

      //verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("Permiso denegado");
      }
      //revisar si hay stock
      for await (const e of input.pedido) {
        const { id, cantidad } = e;
        const producto = await Producto.findById(id);

        if (cantidad > producto.existencia)
          throw new Error(`El producto ${producto.nombre} excede la cantidad disponible`);
        else producto.existencia = producto.existencia - cantidad;

        await producto.save();
      }

      //crear pedido
      const nuevoPedido = new Pedido(input);

      //asignar vendedor de la compra
      nuevoPedido.vendedor = ctx.usuario.id;
      console.log("desoues del error");

      //guardar en la base de datos
      const resultado = await nuevoPedido.save();
      return resultado;
    },

    actualizarPedido: async (_, { id, input }, ctx) => {
      try {
        const { cliente } = input;

        //comprobar si el pedido existe
        const pedido = await Pedido.findById(id);
        if (!pedido) throw new Error("Pedido no encontrado");

        //si el cliente existe
        const clienteExiste = await Cliente.findById(cliente);
        if (!clienteExiste) throw new Error("Cliente no encontrado");
        //Si el cliente y el pedido es del vendedor
        if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
          throw new Error("Permiso denegado");
        }

        //Revisar stock
        for await (const e of pedido.pedido) {
          const { id, cantidad } = e;
          const producto = await Producto.findById(id);

          if (cantidad > producto.existencia)
            throw new Error(`El producto ${producto.nombre} excede la cantidad disponible`);
          else producto.existencia = producto.existencia - cantidad;

          await producto.save();
        }
        //guardar el pedido
        const pedidoUpdate = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true });
        return pedidoUpdate;
      } catch (err) {
        console.log(err);
      }
    },

    eliminarPedido: async (_, { id }, ctx) => {
      try {
        const pedido = await Pedido.findById(id);
        if (!pedido) throw new Error("Pedido no existe");

        if (pedido.vendedor.toString() !== ctx.usuario.id) throw new Error("Permiso denegado");

        await Pedido.findByIdAndDelete(id);

        return "Pedido eliminado";
      } catch (err) {
        console.log(err);
      }
    },
  },
};

module.exports = resolvers;
