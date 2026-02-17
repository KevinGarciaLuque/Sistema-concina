// src/pages/admin/CategoriasAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import ModalConfirm from "../../components/common/ModalConfirm";

import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
  cambiarActivoCategoria,
  actualizarOrdenCategorias,
  eliminarCategoria,
} from "../../api/categorias";

export default function CategoriasAdmin() {
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState([]); // lista base completa
  const [filtro, setFiltro] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);

  const [form, setForm] = useState({ id: null, nombre: "", activo: 1 });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  const [confirm, setConfirm] = useState({ show: false, id: null, nombre: "" });
  const [eliminando, setEliminando] = useState(false);

  const limpiarForm = () => setForm({ id: null, nombre: "", activo: 1 });

  const cargar = async () => {
    setCargando(true);
    setMsg(null);
    try {
      const data = await obtenerCategorias({ todas: true }); // ✅ ahora siempre array
      const ordenadas = [...data].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
      );
      setCategorias(ordenadas);
    } catch (e) {
      console.error(e);
      setMsg({ type: "danger", text: "No se pudieron cargar las categorías." });
      setCategorias([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();

    return [...categorias]
      .filter((c) => {
        if (soloActivas && Number(c.activo) !== 1) return false;
        if (!q) return true;
        return String(c.nombre || "")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [categorias, filtro, soloActivas]);

  const editar = (c) =>
    setForm({
      id: c.id,
      nombre: c.nombre || "",
      activo: Number(c.activo) ? 1 : 0,
    });

  const onSubmit = async (e) => {
    e.preventDefault();

    const nombre = form.nombre.trim();
    if (!nombre) return;

    setGuardando(true);
    setMsg(null);

    try {
      if (!form.id) {
        await crearCategoria({ nombre, activo: 1 });
        setMsg({ type: "success", text: "Categoría creada." });
      } else {
        const cat = categorias.find((x) => x.id === form.id);
        await actualizarCategoria(form.id, {
          nombre,
          orden: cat?.orden ?? 1,
          activo: Number(form.activo) ? 1 : 0,
        });
        setMsg({ type: "success", text: "Categoría actualizada." });
      }

      limpiarForm();
      await cargar();
    } catch (e2) {
      console.error(e2);
      setMsg({
        type: "danger",
        text: e2?.response?.data?.message || "Error al guardar.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (c) => {
    const id = c?.id;
    if (!id) return;

    const nuevo = Number(c.activo) ? 0 : 1;

    // optimista
    setCategorias((prev) =>
      prev.map((x) => (x.id === id ? { ...x, activo: nuevo } : x)),
    );

    try {
      await cambiarActivoCategoria(id, nuevo);
    } catch (e) {
      console.error(e);
      setMsg({ type: "danger", text: "No se pudo cambiar el estado." });
      await cargar();
    }
  };

  const mover = async (id, dir) => {
    // dir: -1 arriba, +1 abajo
    // ✅ trabajamos sobre el orden ACTUAL en pantalla (filtradas)
    const i = filtradas.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= filtradas.length) return;

    const a = filtradas[i];
    const b = filtradas[j];

    // copiamos la lista completa y hacemos swap solo de esos 2 por orden
    const nuevo = [...categorias].map((x) => ({ ...x }));

    const ia = nuevo.findIndex((x) => x.id === a.id);
    const ib = nuevo.findIndex((x) => x.id === b.id);
    if (ia < 0 || ib < 0) return;

    const ordenA = nuevo[ia].orden ?? 1;
    const ordenB = nuevo[ib].orden ?? 1;

    nuevo[ia].orden = ordenB;
    nuevo[ib].orden = ordenA;

    // normalizar 1..n
    const normal = nuevo
      .sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0))
      .map((x, k) => ({ ...x, orden: k + 1 }));

    setCategorias(normal);

    try {
      await actualizarOrdenCategorias(
        normal.map((x) => ({ id: x.id, orden: x.orden })),
      );
      setMsg({ type: "success", text: "Orden actualizado." });
      setTimeout(() => setMsg(null), 1200);
    } catch (e) {
      console.error(e);
      setMsg({ type: "danger", text: "No se pudo guardar el orden." });
      await cargar();
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0">Categorías</h4>
          <small className="text-muted">
            Ordena, activa y mantén el menú con control total.
          </small>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control"
            style={{ width: 260 }}
            placeholder="Buscar categoría..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="soloActivas"
              checked={soloActivas}
              onChange={(e) => setSoloActivas(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="soloActivas">
              Solo activas
            </label>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type} py-2`} role="alert">
          {msg.text}
        </div>
      )}

      <div className="row g-3">
        {/* Formulario */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                {form.id ? "Editar categoría" : "Nueva categoría"}
              </h5>

              <form onSubmit={onSubmit}>
                <label className="form-label">Nombre</label>
                <input
                  className="form-control mb-3"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej: Bebidas"
                  required
                />

                {form.id && (
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="activoCat"
                      checked={Number(form.activo) === 1}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          activo: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    <label className="form-check-label" htmlFor="activoCat">
                      Activo
                    </label>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" disabled={guardando}>
                    {guardando
                      ? "Guardando..."
                      : form.id
                        ? "Actualizar"
                        : "Crear"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={limpiarForm}
                    disabled={guardando}
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
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
                      <th style={{ width: 80 }}>Orden</th>
                      <th>Categoría</th>
                      <th style={{ width: 120 }} className="text-center">
                        Activo
                      </th>
                      <th style={{ width: 160 }} className="text-end">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          Cargando...
                        </td>
                      </tr>
                    ) : filtradas.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          Sin resultados.
                        </td>
                      </tr>
                    ) : (
                      filtradas.map((c, index) => (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex flex-column gap-1">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => mover(c.id, -1)}
                                disabled={index === 0}
                                title="Subir"
                              >
                                ↑
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => mover(c.id, +1)}
                                disabled={index === filtradas.length - 1}
                                title="Bajar"
                              >
                                ↓
                              </button>
                            </div>
                          </td>

                          <td>
                            <div className="fw-semibold">{c.nombre}</div>
                            <small className="text-muted">ID: {c.id}</small>
                          </td>

                          <td className="text-center">
                            <div className="form-check form-switch d-inline-flex">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Number(c.activo) === 1}
                                onChange={() => toggleActivo(c)}
                              />
                            </div>
                          </td>

                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              type="button"
                              title="Editar"
                              onClick={() => editar(c)}
                            >
                              <FaEdit />
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              title="Eliminar"
                              onClick={() =>
                                setConfirm({
                                  show: true,
                                  id: c.id,
                                  nombre: c.nombre,
                                })
                              }
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-muted small">
                Consejo: No borres categorías; mejor desactívalas para no
                afectar productos existentes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Modal confirmación (afuera del scroll) */}
      <ModalConfirm
        show={confirm.show}
        title="Eliminar categoría"
        message={
          <>
            ¿Seguro que deseas eliminar <b>{confirm.nombre}</b>? <br />
            Esta acción no se puede deshacer.
          </>
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={eliminando}
        icon={<FaExclamationTriangle />}
        onCancel={() =>
          !eliminando && setConfirm({ show: false, id: null, nombre: "" })
        }
        onConfirm={async () => {
          try {
            setEliminando(true);
            await eliminarCategoria(confirm.id);
            setMsg({ type: "success", text: "Categoría eliminada." });
            setConfirm({ show: false, id: null, nombre: "" });
            await cargar();
          } catch (e) {
            setMsg({
              type: "danger",
              text:
                e?.response?.data?.message ||
                "No se pudo eliminar la categoría.",
            });
          } finally {
            setEliminando(false);
          }
        }}
      />
    </div>
  );
}
