import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash, FaExclamationTriangle, FaCog } from "react-icons/fa";

import { obtenerCategorias } from "../../api/categorias";
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  subirImagenProducto,
  eliminarProducto,
} from "../../api/productos";

import ModalConfirm from "../../components/common/ModalConfirm";

const money = (n) => {
  const num = Number(n || 0);
  return `L ${num.toFixed(2)}`;
};

export default function ProductosAdmin() {
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);

  // filtros
  const [categoriaId, setCategoriaId] = useState("");
  const [soloActivos, setSoloActivos] = useState(false);
  const [soloEnMenu, setSoloEnMenu] = useState(false);
  const [buscar, setBuscar] = useState("");

  // modal producto (crear/editar)
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  // modal confirmación eliminar
  const [confirm, setConfirm] = useState({ show: false, id: null, nombre: "" });
  const [eliminando, setEliminando] = useState(false);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    id: null,
    categoria_id: "",
    nombre: "",
    descripcion: "",
    precio: "",
    activo: 1,
    en_menu: 1,
    es_combo: 0,
    imagen_url: "",
  });

  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");

  const cargar = async () => {
    setCargando(true);
    try {
      const cats = await obtenerCategorias({ todas: true });
      setCategorias([...cats].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

      const prods = await obtenerProductos();
      setProductos(prods);
    } catch (e) {
      console.error(e);
      setMsg({
        type: "danger",
        text: "No se pudieron cargar productos/categorías.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const catMap = useMemo(() => {
    const map = new Map();
    categorias.forEach((c) => map.set(c.id, c));
    return map;
  }, [categorias]);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return productos
      .filter((p) => {
        if (categoriaId && String(p.categoria_id) !== String(categoriaId))
          return false;
        if (soloActivos && Number(p.activo) !== 1) return false;
        if (soloEnMenu && Number(p.en_menu) !== 1) return false;

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
  }, [productos, categoriaId, soloActivos, soloEnMenu, buscar, catMap]);

  const abrirNuevo = () => {
    setMsg(null);
    setImgFile(null);
    setImgPreview("");
    setForm({
      id: null,
      categoria_id: categorias[0]?.id || "",
      nombre: "",
      descripcion: "",
      precio: "",
      activo: 1,
      en_menu: 1,
      es_combo: 0,
      imagen_url: "",
    });
    setOpen(true);
  };

  const abrirEditar = (p) => {
    setMsg(null);
    setImgFile(null);
    setImgPreview(p.imagen_url || "");
    setForm({
      id: p.id,
      categoria_id: p.categoria_id,
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      precio: String(p.precio ?? ""),
      activo: Number(p.activo) ? 1 : 0,
      en_menu: Number(p.en_menu) ? 1 : 0,
      es_combo: Number(p.es_combo) ? 1 : 0,
      imagen_url: p.imagen_url || "",
    });
    setOpen(true);
  };

  const cerrarModal = () => {
    setOpen(false);
    setImgFile(null);
    setImgPreview("");
  };

  const onPickImage = (file) => {
    setImgFile(file);
    if (file) setImgPreview(URL.createObjectURL(file));
    else setImgPreview(form.imagen_url || "");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    const payload = {
      categoria_id: Number(form.categoria_id),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio: Number(form.precio || 0),
      activo: Number(form.activo) ? 1 : 0,
      en_menu: Number(form.en_menu) ? 1 : 0,
      es_combo: Number(form.es_combo) ? 1 : 0,
    };

    if (!payload.categoria_id)
      return setMsg({ type: "danger", text: "Selecciona una categoría." });
    if (!payload.nombre)
      return setMsg({ type: "danger", text: "El nombre es obligatorio." });

    setGuardando(true);
    try {
      let idp = form.id;

      if (!idp) {
        const r = await crearProducto(payload);
        idp = r.id;
      } else {
        await actualizarProducto(idp, payload);
      }

      if (imgFile) {
        await subirImagenProducto(idp, imgFile);
      }

      await cargar();
      setMsg({ type: "success", text: "Producto guardado correctamente." });
      cerrarModal();
    } catch (e) {
      console.error(e);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "Error al guardar producto.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const toggleField = async (p, field) => {
    const anterior = Number(p[field]) ? 1 : 0;
    const nuevo = anterior ? 0 : 1;

    setProductos((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, [field]: nuevo } : x)),
    );

    try {
      await actualizarProducto(p.id, {
        categoria_id: p.categoria_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        es_combo: field === "es_combo" ? nuevo : Number(p.es_combo) ? 1 : 0,
        activo: field === "activo" ? nuevo : Number(p.activo) ? 1 : 0,
        en_menu: field === "en_menu" ? nuevo : Number(p.en_menu) ? 1 : 0,
      });
    } catch (e) {
      console.error(e);
      setMsg({ type: "danger", text: "No se pudo actualizar el producto." });
      setProductos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, [field]: anterior } : x)),
      );
    }
  };

  const baseURL = import.meta.env.VITE_API_URL;

  const getImgSrc = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${baseURL}${url}`;
  };

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0">Productos</h4>
          <small className="text-muted">
            Control total: precios, menú, combos, estado e imágenes.
          </small>
        </div>

        <button className="btn btn-primary" onClick={abrirNuevo}>
          + Nuevo producto
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type} py-2`} role="alert">
          {msg.text}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          {/* filtros */}
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.orden}. {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Nombre o descripción..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4 col-lg-6 d-flex gap-3 flex-wrap">
              <div className="form-check form-switch mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={soloActivos}
                  onChange={(e) => setSoloActivos(e.target.checked)}
                />
                <label className="form-check-label">Solo activos</label>
              </div>

              <div className="form-check form-switch mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={soloEnMenu}
                  onChange={(e) => setSoloEnMenu(e.target.checked)}
                />
                <label className="form-check-label">Solo en menú</label>
              </div>
            </div>
          </div>

          {/* tabla */}
          <div
            style={{ maxHeight: "65vh", overflow: "auto", borderRadius: 10 }}
          >
            <table className="table table-hover align-middle mb-0">
              <thead
                className="table-light"
                style={{ position: "sticky", top: 0, zIndex: 2 }}
              >
                <tr>
                  <th style={{ width: 80 }}>Img</th>
                  <th>Producto</th>
                  <th style={{ width: 160 }}>Categoría</th>
                  <th style={{ width: 110 }} className="text-end">
                    Precio
                  </th>
                  <th style={{ width: 110 }} className="text-center">
                    Activo
                  </th>
                  <th style={{ width: 120 }} className="text-center">
                    En menú
                  </th>
                  <th style={{ width: 120 }} className="text-center">
                    Combo
                  </th>
                  <th style={{ width: 160 }} className="text-end">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Cargando...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((p) => {
                    const cat = catMap.get(p.categoria_id);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "#f1f3f5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {p.imagen_url ? (
                              <img
                                src={getImgSrc(p.imagen_url)}
                                alt={p.nombre}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span className="text-muted small">Sin</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="fw-semibold">{p.nombre}</div>
                          {p.descripcion ? (
                            <small className="text-muted">
                              {p.descripcion}
                            </small>
                          ) : (
                            <small className="text-muted">—</small>
                          )}
                        </td>

                        <td>
                          <span className="badge text-bg-light">
                            {cat
                              ? `${cat.orden}. ${cat.nombre}`
                              : `ID ${p.categoria_id}`}
                          </span>
                        </td>

                        <td className="text-end">{money(p.precio)}</td>

                        <td className="text-center">
                          <div className="form-check form-switch d-inline-flex">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={Number(p.activo) === 1}
                              onChange={() => toggleField(p, "activo")}
                            />
                          </div>
                        </td>

                        <td className="text-center">
                          <div className="form-check form-switch d-inline-flex">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={Number(p.en_menu) === 1}
                              onChange={() => toggleField(p, "en_menu")}
                            />
                          </div>
                        </td>

                        <td className="text-center">
                          <div className="form-check form-switch d-inline-flex">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={Number(p.es_combo) === 1}
                              onChange={() => toggleField(p, "es_combo")}
                            />
                          </div>
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            title="Modificadores"
                            onClick={() =>
                              navigate(`/admin/productos/${p.id}/modificadores`)
                            }
                          >
                            <FaCog />
                          </button>

                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            title="Editar"
                            onClick={() => abrirEditar(p)}
                          >
                            <FaEdit />
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Eliminar"
                            onClick={() =>
                              setConfirm({
                                show: true,
                                id: p.id,
                                nombre: p.nombre,
                              })
                            }
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-muted small">
            Consejo: “En menú” controla lo que ve el POS. “Activo” controla si
            se puede vender.
          </div>
        </div>
      </div>

      {/* ✅ Modal confirmación (fuera del contenedor con scroll) */}
      <ModalConfirm
        show={confirm.show}
        title="Eliminar producto"
        message={
          <>
            ¿Seguro que deseas eliminar <b>{confirm.nombre}</b>? <br />
            Esta acción es definitiva.
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
            await eliminarProducto(confirm.id);
            setMsg({ type: "success", text: "Producto eliminado." });
            setConfirm({ show: false, id: null, nombre: "" });
            await cargar();
          } catch (e) {
            setMsg({
              type: "danger",
              text:
                e?.response?.data?.message ||
                "No se pudo eliminar el producto.",
            });
          } finally {
            setEliminando(false);
          }
        }}
      />

      {/* Modal crear/editar */}
      {open && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,.45)", zIndex: 1050 }}
          onClick={cerrarModal}
        >
          <div
            className="card shadow-lg position-absolute top-50 start-50 translate-middle"
            style={{ width: "min(920px, 95vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="fw-semibold">
                {form.id ? "Editar producto" : "Nuevo producto"}
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={cerrarModal}
              >
                Cerrar
              </button>
            </div>

            <div className="card-body">
              <form onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-12 col-lg-8">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control mb-2"
                      value={form.nombre}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nombre: e.target.value }))
                      }
                      required
                    />

                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control mb-2"
                      rows="3"
                      value={form.descripcion}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, descripcion: e.target.value }))
                      }
                      placeholder="Opcional (ej: incluye papas, salsa...)"
                    />

                    <div className="row g-2">
                      <div className="col-12 col-md-6">
                        <label className="form-label">Categoría</label>
                        <select
                          className="form-select"
                          value={form.categoria_id}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              categoria_id: e.target.value,
                            }))
                          }
                          required
                        >
                          <option value="">Selecciona…</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.orden}. {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={form.precio}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, precio: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="d-flex gap-4 flex-wrap mt-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={Number(form.activo) === 1}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              activo: e.target.checked ? 1 : 0,
                            }))
                          }
                        />
                        <label className="form-check-label">Activo</label>
                      </div>

                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={Number(form.en_menu) === 1}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              en_menu: e.target.checked ? 1 : 0,
                            }))
                          }
                        />
                        <label className="form-check-label">En menú</label>
                      </div>

                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={Number(form.es_combo) === 1}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              es_combo: e.target.checked ? 1 : 0,
                            }))
                          }
                        />
                        <label className="form-check-label">Es combo</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <label className="form-label">Imagen</label>
                    <div
                      className="border rounded-3 p-2"
                      style={{ background: "#fafafa", minHeight: 220 }}
                    >
                      {imgPreview ? (
                        <img
                          src={getImgSrc(imgPreview)}
                          alt="preview"
                          style={{
                            width: "100%",
                            height: 200,
                            objectFit: "cover",
                            borderRadius: 12,
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center text-muted"
                          style={{ height: 200 }}
                        >
                          Sin imagen
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        className="form-control mt-2"
                        onChange={(e) =>
                          onPickImage(e.target.files?.[0] || null)
                        }
                      />
                      <small className="text-muted d-block mt-1">
                        Se sube al guardar. Formatos: jpg/png/webp.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-primary" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
