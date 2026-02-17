// src/pages/admin/ProductoModificadoresAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { obtenerCategorias } from "../../api/categorias";
import { obtenerProductos } from "../../api/productos";
import {
  obtenerModificadores,
  obtenerModificadoresDeProducto,
  guardarModificadoresDeProducto,
} from "../../api/modificadores";

import { FaSave, FaSyncAlt, FaArrowLeft } from "react-icons/fa";

/* ========= Helpers ========= */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categorias)) return payload.categorias;
  if (Array.isArray(payload?.productos)) return payload.productos;
  if (Array.isArray(payload?.modificadores)) return payload.modificadores;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export default function ProductoModificadoresAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [mods, setMods] = useState([]);

  const [categoriaId, setCategoriaId] = useState("");
  const [buscar, setBuscar] = useState("");

  const [productoSel, setProductoSel] = useState(null);
  const [seleccion, setSeleccion] = useState(new Set());
  const [seleccionInicial, setSeleccionInicial] = useState(new Set());

  const [msg, setMsg] = useState(null);

  const catMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(categorias) ? categorias : []).forEach((c) =>
      m.set(c.id, c),
    );
    return m;
  }, [categorias]);

  const productosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (Array.isArray(productos) ? productos : [])
      .filter((p) => {
        if (categoriaId && String(p.categoria_id) !== String(categoriaId))
          return false;
        if (!q) return true;
        const t = `${p.nombre || ""} ${p.descripcion || ""}`.toLowerCase();
        return t.includes(q);
      })
      .sort((a, b) => {
        const ca = catMap.get(a.categoria_id)?.orden ?? 9999;
        const cb = catMap.get(b.categoria_id)?.orden ?? 9999;
        if (ca !== cb) return ca - cb;
        return (a.nombre || "").localeCompare(b.nombre || "");
      });
  }, [productos, categoriaId, buscar, catMap]);

  const modsActivosOrden = useMemo(() => {
    return (Array.isArray(mods) ? mods : [])
      .filter((m) => Number(m.activo) === 1)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [mods]);

  const cambiosPendientes = useMemo(() => {
    if (seleccion.size !== seleccionInicial.size) return true;
    for (const mid of seleccion) if (!seleccionInicial.has(mid)) return true;
    return false;
  }, [seleccion, seleccionInicial]);

  const cargarAsignacion = async (productoId) => {
    setMsg(null);
    try {
      const idsRaw = await obtenerModificadoresDeProducto(productoId);
      const ids = toArray(idsRaw)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      const setIds = new Set(ids);
      setSeleccion(setIds);
      setSeleccionInicial(new Set(setIds));
    } catch (e) {
      console.error(e);
      setSeleccion(new Set());
      setSeleccionInicial(new Set());
      setMsg({
        type: "danger",
        text: "No se pudo cargar la asignación del producto.",
      });
    }
  };

  const cargarTodo = async () => {
    setCargando(true);
    setMsg(null);

    try {
      // ✅ Categorías
      const catsRaw = await obtenerCategorias({ todas: true });
      const cats = toArray(catsRaw)
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setCategorias(cats);

      // ✅ Productos
      const prodsRaw = await obtenerProductos();
      const prods = toArray(prodsRaw);
      setProductos(prods);

      // ✅ Modificadores
      const modifsRaw = await obtenerModificadores({ todos: true });
      const modifs = toArray(modifsRaw);
      setMods(modifs);

      // ✅ Producto seleccionado (por URL o primero)
      if (prods.length > 0) {
        if (id) {
          const found = prods.find((p) => String(p.id) === String(id));
          setProductoSel(found || prods[0]);
        } else {
          setProductoSel((prev) => prev || prods[0]);
        }
      } else {
        setProductoSel(null);
      }
    } catch (e) {
      console.error(e);
      setMsg({
        type: "danger",
        text: "No se pudo cargar el módulo de asignación.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // si cambia el id de la URL, selecciona ese producto
  useEffect(() => {
    if (!id || productosFiltrados.length === 0) return;
    const found = (Array.isArray(productos) ? productos : []).find(
      (p) => String(p.id) === String(id),
    );
    if (found && productoSel?.id !== found.id) setProductoSel(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, productos]);

  // cargar asignación al cambiar producto
  useEffect(() => {
    if (productoSel?.id) cargarAsignacion(productoSel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoSel?.id]);

  const toggle = (modId) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const seleccionarTodo = () =>
    setSeleccion(new Set(modsActivosOrden.map((m) => Number(m.id))));
  const limpiarSeleccion = () => setSeleccion(new Set());

  const guardar = async () => {
    if (!productoSel?.id) return;
    setGuardando(true);
    setMsg(null);

    try {
      await guardarModificadoresDeProducto(
        productoSel.id,
        Array.from(seleccion),
      );
      setSeleccionInicial(new Set(seleccion));
      setMsg({ type: "success", text: "Asignación guardada correctamente." });
    } catch (e) {
      console.error(e);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo guardar.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0">Asignación de modificadores</h4>
          <small className="text-muted">
            Elige un producto y marca qué modificadores aplican (ej: Gringas →
            Proteína).
          </small>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/admin/productos")}
            title="Volver a productos"
          >
            <FaArrowLeft className="me-2" />
            Atrás
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={cargarTodo}
            disabled={cargando || guardando}
          >
            <FaSyncAlt className="me-2" />
            Recargar
          </button>

          <button
            className="btn btn-primary"
            onClick={guardar}
            disabled={!productoSel?.id || guardando || !cambiosPendientes}
            title={!cambiosPendientes ? "No hay cambios" : "Guardar asignación"}
          >
            <FaSave className="me-2" />
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <div className="row g-3">
        {/* Izquierda */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row g-2 mb-2">
                <div className="col-12 col-md-6">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {(Array.isArray(categorias) ? categorias : []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.orden ?? 0}. {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Buscar producto</label>
                  <input
                    className="form-control"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder="Nombre o descripción..."
                  />
                </div>
              </div>

              <div
                style={{
                  maxHeight: "65vh",
                  overflow: "auto",
                  borderRadius: 10,
                }}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead
                    className="table-light"
                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                  >
                    <tr>
                      <th>Producto</th>
                      <th style={{ width: 130 }}>Categoría</th>
                      <th className="text-end" style={{ width: 90 }}>
                        Precio
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4">
                          Cargando...
                        </td>
                      </tr>
                    ) : productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4">
                          Sin productos.
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((p) => {
                        const cat = catMap.get(p.categoria_id);
                        const selected = productoSel?.id === p.id;

                        return (
                          <tr
                            key={p.id}
                            className={selected ? "table-primary" : ""}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setProductoSel(p);
                              navigate(
                                `/admin/productos/${p.id}/modificadores`,
                              );
                            }}
                          >
                            <td>
                              <div className="fw-semibold">{p.nombre}</div>
                              <small className="text-muted">
                                {p.en_menu ? "En menú" : "Fuera de menú"} ·{" "}
                                {p.activo ? "Activo" : "Inactivo"}
                              </small>
                            </td>
                            <td>
                              <span className="badge text-bg-light">
                                {cat ? cat.nombre : `ID ${p.categoria_id}`}
                              </span>
                            </td>
                            <td className="text-end">
                              L {Number(p.precio || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-muted small">
                Tip: filtra por categoría para asignar rápido.
              </div>
            </div>
          </div>
        </div>

        {/* Derecha */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <h6 className="mb-0">Modificadores disponibles</h6>
                  <small className="text-muted">
                    Producto:{" "}
                    <b>{productoSel?.nombre || "Selecciona un producto"}</b>
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={seleccionarTodo}
                    disabled={!productoSel?.id}
                  >
                    Seleccionar todo
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={limpiarSeleccion}
                    disabled={!productoSel?.id}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div
                className="border rounded-3 p-2"
                style={{ maxHeight: "65vh", overflow: "auto" }}
              >
                {!productoSel?.id ? (
                  <div className="text-center text-muted py-5">
                    Selecciona un producto para comenzar.
                  </div>
                ) : modsActivosOrden.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    No hay modificadores activos.
                  </div>
                ) : (
                  <div className="row g-2">
                    {modsActivosOrden.map((m) => {
                      const checked = seleccion.has(Number(m.id));
                      return (
                        <div className="col-12 col-md-6" key={m.id}>
                          <label
                            className="d-flex align-items-start gap-2 p-2 border rounded-3"
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input mt-1"
                              checked={checked}
                              onChange={() => toggle(Number(m.id))}
                            />

                            <div className="flex-grow-1">
                              <div className="fw-semibold">{m.nombre}</div>
                              <small className="text-muted">
                                {m.requerido ? "Requerido" : "Opcional"} ·{" "}
                                {m.multiple ? "Múltiple" : "Único"}
                              </small>
                            </div>

                            {checked && (
                              <span className="badge text-bg-primary">
                                Asignado
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-2 text-muted small">
                Nota: solo se muestran modificadores <b>activos</b>. Si quieres
                asignar uno, actívalo primero.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
