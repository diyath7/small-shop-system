--
-- PostgreSQL database dump
--

\restrict c48m2NZgeoSR2O0CwFEKV6f3QMUjAVY9c37JHhUvzrwH6f7y3Z5kbXIlAzH7qFO

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

-- Started on 2025-12-10 01:01:33

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16586)
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    batch_code character varying(50),
    expiry_date date,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16585)
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO postgres;

--
-- TOC entry 4898 (class 0 OID 0)
-- Dependencies: 223
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- TOC entry 228 (class 1259 OID 16615)
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_lines (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL
);


ALTER TABLE public.invoice_lines OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16614)
-- Name: invoice_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_lines_id_seq OWNER TO postgres;

--
-- TOC entry 4901 (class 0 OID 0)
-- Dependencies: 227
-- Name: invoice_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_lines_id_seq OWNED BY public.invoice_lines.id;


--
-- TOC entry 226 (class 1259 OID 16599)
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    user_id integer,
    payment_method character varying(30),
    discount numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    customer_name character varying(100),
    invoice_date date,
    total_amount numeric(12,2),
    status character varying(50)
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16598)
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- TOC entry 4904 (class 0 OID 0)
-- Dependencies: 225
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- TOC entry 230 (class 1259 OID 16632)
-- Name: product_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_batches (
    id integer NOT NULL,
    product_id integer NOT NULL,
    batch_code character varying(50) NOT NULL,
    expiry_date date NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    supplier_id integer,
    supplier_invoice_no character varying(50),
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp without time zone,
    CONSTRAINT product_batches_quantity_check CHECK ((quantity >= 0))
);


ALTER TABLE public.product_batches OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16631)
-- Name: product_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_batches_id_seq OWNER TO postgres;

--
-- TOC entry 4907 (class 0 OID 0)
-- Dependencies: 229
-- Name: product_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_batches_id_seq OWNED BY public.product_batches.id;


--
-- TOC entry 222 (class 1259 OID 16573)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50),
    unit_price numeric(10,2) NOT NULL,
    reorder_level integer DEFAULT 0,
    supplier_id integer
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16572)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 4910 (class 0 OID 0)
-- Dependencies: 221
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 216 (class 1259 OID 16538)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16537)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 4913 (class 0 OID 0)
-- Dependencies: 215
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 232 (class 1259 OID 16664)
-- Name: stock_write_offs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_write_offs (
    id integer NOT NULL,
    product_id integer NOT NULL,
    batch_id integer NOT NULL,
    quantity integer NOT NULL,
    reason character varying(50) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    write_off_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by integer NOT NULL,
    notes text,
    CONSTRAINT stock_write_offs_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.stock_write_offs OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16663)
-- Name: stock_write_offs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_write_offs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_write_offs_id_seq OWNER TO postgres;

--
-- TOC entry 4916 (class 0 OID 0)
-- Dependencies: 231
-- Name: stock_write_offs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_write_offs_id_seq OWNED BY public.stock_write_offs.id;


--
-- TOC entry 220 (class 1259 OID 16564)
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20),
    email character varying(100),
    address text
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16563)
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- TOC entry 4919 (class 0 OID 0)
-- Dependencies: 219
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- TOC entry 218 (class 1259 OID 16547)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16546)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4922 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4680 (class 2604 OID 16589)
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- TOC entry 4685 (class 2604 OID 16618)
-- Name: invoice_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines ALTER COLUMN id SET DEFAULT nextval('public.invoice_lines_id_seq'::regclass);


--
-- TOC entry 4682 (class 2604 OID 16602)
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- TOC entry 4686 (class 2604 OID 16635)
-- Name: product_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches ALTER COLUMN id SET DEFAULT nextval('public.product_batches_id_seq'::regclass);


--
-- TOC entry 4678 (class 2604 OID 16576)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 4674 (class 2604 OID 16541)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4689 (class 2604 OID 16667)
-- Name: stock_write_offs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_write_offs ALTER COLUMN id SET DEFAULT nextval('public.stock_write_offs_id_seq'::regclass);


--
-- TOC entry 4677 (class 2604 OID 16567)
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- TOC entry 4675 (class 2604 OID 16550)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4883 (class 0 OID 16586)
-- Dependencies: 224
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, product_id, quantity, batch_code, expiry_date, created_at) FROM stdin;
\.


--
-- TOC entry 4887 (class 0 OID 16615)
-- Dependencies: 228
-- Data for Name: invoice_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_lines (id, invoice_id, product_id, quantity, unit_price, line_total) FROM stdin;
1	4	1	5	300.00	1500.00
2	4	9	10	200.00	2000.00
3	4	11	5	300.00	1500.00
4	5	17	4	220.00	880.00
5	6	2	10	300.00	3000.00
6	8	3	8	170.00	1360.00
7	8	16	4	350.00	1400.00
8	9	2	1	300.00	300.00
9	9	11	8	100.00	800.00
10	9	14	2	3690.00	7380.00
11	10	3	1	170.00	170.00
12	11	5	1	150.00	150.00
13	11	16	1	350.00	350.00
14	11	16	1	350.00	350.00
15	12	6	4	270.00	1080.00
16	13	4	1	300.00	300.00
17	13	15	1	90.00	90.00
18	14	12	1	694.00	694.00
19	15	5	23	150.00	3450.00
20	16	2	2	300.00	600.00
21	17	9	1	200.00	200.00
22	18	12	1	694.00	694.00
23	19	16	4	350.00	1400.00
24	20	18	10	80.00	800.00
25	21	19	3	200.00	600.00
26	21	11	10	100.00	1000.00
27	22	12	1	694.00	694.00
28	22	10	1	100.00	100.00
29	22	3	1	170.00	170.00
30	22	2	1	300.00	300.00
31	22	1	1	150.00	150.00
32	22	17	1	220.00	220.00
33	24	11	98	100.00	9800.00
34	25	14	8	3690.00	29520.00
35	26	19	4	200.00	800.00
36	27	2	10	300.00	3000.00
39	29	19	2	200.00	400.00
40	29	18	10	80.00	800.00
41	29	17	13	220.00	2860.00
42	30	13	1	1482.00	1482.00
49	43	19	3	200.00	600.00
50	43	18	1	80.00	80.00
51	43	11	2	100.00	200.00
52	43	14	6	3690.00	22140.00
53	45	14	6	3690.00	22140.00
54	47	9	15	200.00	3000.00
\.


--
-- TOC entry 4885 (class 0 OID 16599)
-- Dependencies: 226
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, user_id, payment_method, discount, created_at, customer_name, invoice_date, total_amount, status) FROM stdin;
4	INV00001	\N	\N	0.00	2025-12-07 00:12:37.713901	Walk-in Customer	2025-09-13	5000.00	PAID
5	INV00005	\N	\N	0.00	2025-12-07 21:43:36.584976	Walk-in Customer	2025-12-07	880.00	PAID
6	INV00006	\N	\N	0.00	2025-12-07 21:45:06.674803	Walk-in Customer	2025-12-07	3000.00	PAID
8	INV00007	\N	\N	0.00	2025-12-07 22:30:03.021419	Walk-in Customer	2025-12-07	2760.00	PAID
9	INV00009	\N	\N	0.00	2025-12-07 22:48:20.399388	Mr.Diyath	2025-12-07	8480.00	PAID
10	INV00010	\N	\N	0.00	2025-12-07 23:40:07.246468	Walk-in Customer	2025-12-07	170.00	PAID
11	INV00011	\N	\N	0.00	2025-12-07 23:44:21.105168	Walk-in Customer	2025-12-07	850.00	PAID
12	INV00012	\N	\N	0.00	2025-12-07 23:52:06.066716	Walk-in Customer	2025-12-07	1080.00	PAID
13	INV00013	\N	\N	0.00	2025-12-07 23:52:27.633261	Walk-in Customer	2025-12-07	390.00	PAID
14	INV00014	\N	\N	94.00	2025-12-08 00:05:35.843367	Walk-in Customer	2025-12-07	600.00	PAID
15	INV00015	\N	\N	50.00	2025-12-08 00:16:48.017716	Walk-in Customer	2025-12-07	3400.00	PAID
16	INV00016	\N	\N	400.00	2025-12-08 00:43:29.093547	Walk-in Customer	2025-12-08	200.00	PAID
17	INV00017	\N	\N	0.00	2025-12-08 00:45:44.80955	Walk-in Customer	2025-12-08	200.00	PAID
18	INV00018	\N	\N	0.00	2025-12-08 00:54:52.812839	Walk-in Customer	2025-12-08	694.00	PAID
19	INV00019	\N	\N	200.00	2025-12-08 01:00:48.55888	Walk-in Customer	2025-12-08	1200.00	PAID
20	INV00020	\N	\N	0.00	2025-12-08 10:37:48.279071	Walk-in Customer	2025-12-08	800.00	PAID
21	INV00021	\N	\N	100.00	2025-12-08 15:40:08.247231	Dilhan	2025-12-08	1500.00	PAID
22	INV00022	\N	\N	0.00	2025-12-08 15:41:25.010221	Walk-in Customer	2025-12-08	1634.00	PAID
24	INV00023	\N	\N	0.00	2025-12-08 18:04:29.177458	Walk-in Customer	2025-12-08	9800.00	PAID
25	INV00025	\N	\N	0.00	2025-12-08 18:05:28.144071	Walk-in Customer	2025-12-08	29520.00	PAID
26	INV00026	\N	\N	0.00	2025-12-08 18:46:08.207624	Walk-in Customer	2025-12-08	800.00	PAID
27	INV00027	\N	\N	0.00	2025-12-08 20:10:42.474185	Walk-in Customer	2025-12-08	3000.00	PAID
29	INV00028	\N	\N	0.00	2025-12-09 15:39:20.094202	Walk-in Customer	2025-12-09	4060.00	PAID
30	INV00030	\N	\N	0.00	2025-12-09 19:18:59.091433	Walk-in Customer	2025-12-09	1482.00	PAID
43	INV00031	\N	\N	0.00	2025-12-09 23:38:13.1134	Walk-in Customer	2025-12-09	23020.00	PAID
45	INV00044	\N	\N	0.00	2025-12-09 23:39:33.464922	Walk-in Customer	2025-12-09	22140.00	PAID
47	INV00046	\N	\N	0.00	2025-12-10 00:33:25.964606	Walk-in Customer	2025-12-10	3000.00	PAID
\.


--
-- TOC entry 4889 (class 0 OID 16632)
-- Dependencies: 230
-- Data for Name: product_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_batches (id, product_id, batch_code, expiry_date, quantity, unit_cost, created_at, supplier_id, supplier_invoice_no, is_paid, paid_at) FROM stdin;
17	15	WB1L_2025_01	2025-10-10	0	70.00	2025-12-06 21:01:01.022731	\N	\N	f	\N
3	1	SPR500_2025_01	2025-12-01	0	120.00	2025-12-06 20:42:18.1257	\N	\N	f	\N
32	3	OC_500_2025_02	2026-05-31	20	140.00	2025-12-09 15:37:23.951882	3	SUPINV00007	t	2025-12-09 15:37:51.615
33	1	SPR500_2025_02	2026-06-30	20	130.00	2025-12-09 15:37:23.953429	3	SUPINV00007	t	2025-12-09 15:37:55.406
5	7	CC500_2025_01	2026-01-30	60	140.00	2025-12-06 20:54:44.678157	\N	\N	f	\N
9	7	CC500_2025_02	2026-01-30	60	140.00	2025-12-06 20:58:42.1076	\N	\N	f	\N
10	8	CC1L_2025_01	2026-07-15	50	260.00	2025-12-06 20:59:02.155575	\N	\N	f	\N
20	17	MOUNT_500_2025_01	2026-05-31	2	250.00	2025-12-07 20:26:05.809288	\N	\N	f	\N
15	13	LG5_2027_01	2027-12-31	29	1200.00	2025-12-06 21:00:38.200599	\N	\N	f	\N
34	13	LG5_2025_02	2029-10-31	10	1482.00	2025-12-09 19:19:45.056287	4	SUPINV00008	t	2025-12-09 19:19:59.446
31	18	HYOGURT_80G_2025_02	2025-12-09	0	80.00	2025-12-09 14:28:07.356215	2	SUPINV00006	t	2025-12-09 19:20:08.268
8	6	CS1L_2025_01	2026-04-05	66	220.00	2025-12-06 20:58:30.888185	\N	\N	f	\N
6	4	OC1L_2025_01	2026-06-10	74	240.00	2025-12-06 20:57:28.643292	\N	\N	f	\N
27	19	SINIKE1KG_2025_01	2025-12-14	0	180.00	2025-12-08 15:38:52.47788	6	SUPINV00002	t	2025-12-08 18:46:29.681
7	5	CS500_2026_03	2026-03-30	86	120.00	2025-12-06 20:58:08.792814	\N	\N	f	\N
22	18	HYOGURT_80G_2025_01	2026-01-25	0	60.00	2025-12-08 10:36:06.885439	\N	\N	f	\N
25	11	HCM180_2025_03	2026-01-26	0	80.00	2025-12-08 13:06:29.417906	2	\N	t	2025-12-08 16:23:18.302
18	16	WB5L_2025_01	2026-11-20	140	300.00	2025-12-06 21:01:16.700654	\N	\N	f	\N
26	8	CC1L_2025_02	2026-02-28	1	260.00	2025-12-08 14:18:23.976302	3	SUPINV00001	t	2025-12-08 14:29:23.24
16	14	LG12_2027_01	2028-01-30	3	3000.00	2025-12-06 21:00:52.310662	\N	\N	f	\N
14	12	LG23_2027_01	2027-12-31	37	500.00	2025-12-06 21:00:30.04958	\N	\N	f	\N
12	10	HVM180_2026_01	2026-01-25	99	80.00	2025-12-06 20:59:54.443992	\N	\N	f	\N
19	3	OC_500_2025_01	2026-03-31	0	150.00	2025-12-07 19:42:07.436531	\N	\N	f	\N
11	9	HM250_2026_01	2026-01-19	94	150.00	2025-12-06 20:59:30.652318	\N	\N	f	\N
23	13	LG5_2025_01	2028-09-01	3	500.00	2025-12-08 11:52:01.062832	4	\N	t	2025-12-08 16:52:44.871
24	14	LG12_2027_02	2028-09-30	10	3000.00	2025-12-08 12:39:30.521734	4	\N	t	2025-12-08 16:52:46.103
28	15	WB1L_2025_02	2026-03-31	10	90.00	2025-12-08 16:52:14.667184	5	SUPINV00003	t	2025-12-08 16:52:51.349
13	11	HCM180_2025_01	2025-12-30	0	80.00	2025-12-06 21:00:15.742425	\N	\N	f	\N
21	11	HCM180_2025_02	2026-01-12	0	80.00	2025-12-08 10:30:32.872037	\N	\N	f	\N
29	8	CC1L_2025_02	2025-12-31	10	300.00	2025-12-08 19:09:01.782591	3	SUPINV00004	t	2025-12-08 19:09:38.76
30	16	WB5L_2025_01	2026-01-31	1	300.00	2025-12-08 20:09:46.078014	5	SUPINV00005	f	\N
4	2	SPRL1_2025_01	2025-12-31	16	200.00	2025-12-06 20:54:06.878889	\N	\N	f	\N
\.


--
-- TOC entry 4881 (class 0 OID 16573)
-- Dependencies: 222
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, category, unit_price, reorder_level, supplier_id) FROM stdin;
9	Highland Sterilized Milk 250ml	Milk	200.00	10	2
10	Highland Vanilla Flavoured Milk 180ml	Milk	100.00	10	2
11	Highland Chocolate Flavoured Milk 180ml	Milk	100.00	10	2
18	Highland Set Yogurt 80G	Set Yogurt	80.00	20	2
1	Sprite 500ml	Soft Drink	150.00	10	3
2	Sprite 1L	Soft Drink	300.00	10	3
4	Orange Crush 1L	Soft Drink	300.00	10	3
5	Cream Soda 500ml	Soft Drink	150.00	10	3
6	Cream Soda 1L	Soft Drink	270.00	10	3
7	Coca Cola 500ml	Soft Drink	150.00	10	3
8	Coca Cola 1L	Soft Drink	300.00	10	3
17	Mountain Dew 500ml	Soft Drink	220.00	15	3
3	Orange Crush 500ml	Soft Drink	170.00	10	3
12	2.3KG Litro Gas	Gas	694.00	5	4
13	5KG Litro Gas	Gas	1482.00	5	4
14	12.5KG Litro Gas	Gas	3690.00	5	4
15	1 LTR Water Bottle	Water	90.00	20	5
16	5 LTR Water Bottle	Water	350.00	10	5
19	Siini Kesel 1KG	Banana	200.00	10	6
\.


--
-- TOC entry 4875 (class 0 OID 16538)
-- Dependencies: 216
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	ADMIN
2	MANAGER
3	CASHIER
\.


--
-- TOC entry 4891 (class 0 OID 16664)
-- Dependencies: 232
-- Data for Name: stock_write_offs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_write_offs (id, product_id, batch_id, quantity, reason, unit_cost, total_cost, write_off_date, created_by, notes) FROM stdin;
1	15	17	199	EXPIRED	70.00	13930.00	2025-12-08	1	Expired stock cleared via UI
2	1	3	44	EXPIRED	120.00	5280.00	2025-12-08	1	Expired stock cleared via UI
\.


--
-- TOC entry 4879 (class 0 OID 16564)
-- Dependencies: 220
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, phone, email, address) FROM stdin;
2	Highland Dairy Supply	0719876543	sales@highlanddairy.lk	45, Milk Factory Road, Gampaha
3	Mega Soft Drinks Pvt Ltd	0751122334	contact@megasoftdrinks.lk	22, Beverage Lane, Kandy
4	Suwarapola Gas Point	0114 980 660	info@litrogas.lk	QWX7+56P, Piliyandala 10300
5	Diyath Wanigasekara	0723738338	diyathwanigasekara7@gmail.com	357/3, Polgahakottanuwa, Batakaththara, Makandana
6	Rangana Fernando	0763020674	ranganaf124@gmail.com	125/A, Berawawala, Madapatha
\.


--
-- TOC entry 4877 (class 0 OID 16547)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, role_id, created_at) FROM stdin;
1	admin1	$2b$10$4VrByKp/3s89yE7CvPGLOedQrRXYylygzle49RyFT2yM8lo2vXHWS	1	2025-12-06 20:23:59.044962
2	cashier1	$2b$10$ylmWlclAGZX7tl92OeHmhOjj5TtVgDaZ1qcTG9hJ2f3uSDjBytPEK	3	2025-12-09 18:23:17.919198
3	manager1	$2b$10$3EdX9wyd96HigrQ5dUufJOSWMTD5XITnfeuaGuYyQ2iNdkSKOttxe	2	2025-12-09 18:31:44.883785
\.


--
-- TOC entry 4924 (class 0 OID 0)
-- Dependencies: 223
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 1, false);


--
-- TOC entry 4925 (class 0 OID 0)
-- Dependencies: 227
-- Name: invoice_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_lines_id_seq', 54, true);


--
-- TOC entry 4926 (class 0 OID 0)
-- Dependencies: 225
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 47, true);


--
-- TOC entry 4927 (class 0 OID 0)
-- Dependencies: 229
-- Name: product_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_batches_id_seq', 34, true);


--
-- TOC entry 4928 (class 0 OID 0)
-- Dependencies: 221
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 19, true);


--
-- TOC entry 4929 (class 0 OID 0)
-- Dependencies: 215
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 4930 (class 0 OID 0)
-- Dependencies: 231
-- Name: stock_write_offs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_write_offs_id_seq', 2, true);


--
-- TOC entry 4931 (class 0 OID 0)
-- Dependencies: 219
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 6, true);


--
-- TOC entry 4932 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- TOC entry 4706 (class 2606 OID 16592)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 4712 (class 2606 OID 16620)
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- TOC entry 4708 (class 2606 OID 16608)
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- TOC entry 4710 (class 2606 OID 16606)
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 4715 (class 2606 OID 16639)
-- Name: product_batches product_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 4704 (class 2606 OID 16579)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4694 (class 2606 OID 16545)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 4696 (class 2606 OID 16543)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4719 (class 2606 OID 16673)
-- Name: stock_write_offs stock_write_offs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_write_offs
    ADD CONSTRAINT stock_write_offs_pkey PRIMARY KEY (id);


--
-- TOC entry 4702 (class 2606 OID 16571)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 4717 (class 2606 OID 16646)
-- Name: product_batches unique_product_batch; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT unique_product_batch UNIQUE (product_id, batch_code, expiry_date);


--
-- TOC entry 4698 (class 2606 OID 16555)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4700 (class 2606 OID 16557)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4713 (class 1259 OID 16694)
-- Name: idx_product_batches_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_batches_supplier_id ON public.product_batches USING btree (supplier_id);


--
-- TOC entry 4722 (class 2606 OID 16593)
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4724 (class 2606 OID 16621)
-- Name: invoice_lines invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- TOC entry 4725 (class 2606 OID 16626)
-- Name: invoice_lines invoice_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4723 (class 2606 OID 16609)
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4726 (class 2606 OID 16640)
-- Name: product_batches product_batches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4727 (class 2606 OID 16689)
-- Name: product_batches product_batches_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- TOC entry 4721 (class 2606 OID 16580)
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- TOC entry 4728 (class 2606 OID 16679)
-- Name: stock_write_offs stock_write_offs_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_write_offs
    ADD CONSTRAINT stock_write_offs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.product_batches(id);


--
-- TOC entry 4729 (class 2606 OID 16684)
-- Name: stock_write_offs stock_write_offs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_write_offs
    ADD CONSTRAINT stock_write_offs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4730 (class 2606 OID 16674)
-- Name: stock_write_offs stock_write_offs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_write_offs
    ADD CONSTRAINT stock_write_offs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4720 (class 2606 OID 16558)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 4897 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory TO shop_user;


--
-- TOC entry 4899 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE inventory_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_id_seq TO shop_user;


--
-- TOC entry 4900 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE invoice_lines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoice_lines TO shop_user;


--
-- TOC entry 4902 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE invoice_lines_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.invoice_lines_id_seq TO shop_user;


--
-- TOC entry 4903 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO shop_user;


--
-- TOC entry 4905 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE invoices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.invoices_id_seq TO shop_user;


--
-- TOC entry 4906 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE product_batches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_batches TO shop_user;


--
-- TOC entry 4908 (class 0 OID 0)
-- Dependencies: 229
-- Name: SEQUENCE product_batches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.product_batches_id_seq TO shop_user;


--
-- TOC entry 4909 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO shop_user;


--
-- TOC entry 4911 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.products_id_seq TO shop_user;


--
-- TOC entry 4912 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO shop_user;


--
-- TOC entry 4914 (class 0 OID 0)
-- Dependencies: 215
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO shop_user;


--
-- TOC entry 4915 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE stock_write_offs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stock_write_offs TO shop_user;


--
-- TOC entry 4917 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE stock_write_offs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.stock_write_offs_id_seq TO shop_user;


--
-- TOC entry 4918 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO shop_user;


--
-- TOC entry 4920 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE suppliers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq TO shop_user;


--
-- TOC entry 4921 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO shop_user;


--
-- TOC entry 4923 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO shop_user;


-- Completed on 2025-12-10 01:01:33

--
-- PostgreSQL database dump complete
--

\unrestrict c48m2NZgeoSR2O0CwFEKV6f3QMUjAVY9c37JHhUvzrwH6f7y3Z5kbXIlAzH7qFO

