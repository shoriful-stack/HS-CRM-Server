const express = require('express');
const app = express();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.byauspy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const projectsCollection = client.db("crmDb").collection("projects");
        const contractsCollection = client.db("crmDb").collection("contracts");
        const customersCollection = client.db("crmDb").collection("customers");
        const employeesCollection = client.db("crmDb").collection("employees");
        const projects_MasterCollection = client.db("crmDb").collection("projects_master");
        const departmentsCollection = client.db("crmDb").collection("departments");
        const designationsCollection = client.db("crmDb").collection("designations");

        await customersCollection.createIndex(
            { name: 1 },
            { unique: true, name: "name" }
        );
        await departmentsCollection.createIndex(
            { department_name: 1 },
            { unique: true, name: "department_name" }
        );
        await designationsCollection.createIndex(
            { designation: 1 },
            { unique: true, name: "designation" }
        );
        await employeesCollection.createIndex(
            { employee_name: 1 },
            { unique: true, name: "employee_name" }
        );
        await projects_MasterCollection.createIndex(
            { project_name: 1 },
            { unique: true, name: "project_name" }
        );

        // Set storage engine
        const storage = multer.diskStorage({
            destination: './uploads/',  // You can change the path as needed
            filename: (req, file, cb) => {
                cb(null, Date.now() + path.extname(file.originalname)); // Append file extension
            },
        });


        // Initialize upload
        const upload = multer({
            storage: storage,
            limits: { fileSize: 10000000 }, // Limit file size
            fileFilter: (req, file, cb) => {
                checkFileType(file, cb);
            },
        });

        // Check file type
        function checkFileType(file, cb) {
            const filetypes = /jpeg|jpg|png|pdf/;
            const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = filetypes.test(file.mimetype);

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb('Error: Only images and PDFs are allowed!');
            }
        }


        // insert a project
        app.post("/projects", async (req, res) => {
            const projects = req.body;
            const result = await projectsCollection.insertOne(projects);
            res.send(result);
        });

        // New API for exporting all projects without pagination
        app.get("/projects/all", async (req, res) => {
            try {
                const projects = await projectsCollection.find().toArray();
                res.send(projects);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all projects" });
            }
        });

        // Get 1st 10 customers with pagination
        app.get("/projects", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                // Default to 10 items per page
                const skip = (page - 1) * limit;

                const total = await projectsCollection.countDocuments();
                const projects = await projectsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    projects,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch customers" });
            }
        });
        // update a projects
        app.patch('/projects/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedProject = {
                $set: {
                    project_name: item.project_name,
                    customer_name: item.customer_name,
                    project_category: item.project_category,
                    department: item.department,
                    hod: item.hod,
                    pm: item.pm,
                    year: item.year,
                    phase: item.phase,
                    project_code: item.project_code
                }
            }

            const result = await projectsCollection.updateOne(filter, updatedProject)
            res.send(result);
        });

        // import projects functionality
        app.post('/projects/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const projects = req.body;

                // Ensure projects is an array
                if (!Array.isArray(projects) || projects.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of projects' });
                }

                const result = await projectsCollection.insertMany(projects, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import projects' });
            }
        });


        // insert a customer with duplicate error handling
        app.post("/customers", async (req, res) => {
            const customers = req.body;
            try {
                const result = await customersCollection.insertOne(customers);
                res.send(result);
            }
            catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Customer already exists." });
                } else {
                    console.error("Error inserting customer:", error);
                    res.status(500).send({ error: "Failed to add customer." });
                }
            }
        });

        // import functionality
        app.post('/customers/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const customers = req.body;

                // Ensure customers is an array
                if (!Array.isArray(customers) || customers.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of customers' });
                }

                const result = await customersCollection.insertMany(customers, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import customers' });
            }
        });

        // New API for exporting all projects without pagination
        app.get("/customers/all", async (req, res) => {
            try {
                // Fetch all customers
                const customers = await customersCollection.find().toArray();
                res.send(customers);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all customers" });
            }
        });


        // Get 1st 10 customers with pagination
        app.get("/customers", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await customersCollection.countDocuments();
                const customers = await customersCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    customers,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch customers" });
            }
        });


        // Update a customers and related employees
        app.patch('/customers/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            // Start a session for transaction
            const session = client.startSession();

            try {
                // Start transaction
                await session.withTransaction(async () => {
                    // 1. Find the existing customers
                    const existingCustomer = await customersCollection.findOne(filter, { session });
                    if (!existingCustomer) {
                        res.status(404).send({ error: 'Customer not found' });
                        return;
                    }

                    const oldCustomer = existingCustomer.name;

                    // 2. Update the customer
                    const updatedCustomer = {
                        $set: {
                            name: item.name,
                            phone: item.phone,
                            email: item.email,
                            address: item.address,
                            status: item.status
                        }
                    };

                    const result = await customersCollection.updateOne(filter, updatedCustomer, { session });

                    // 3. If the customer name has changed, update related projects
                    if (oldCustomer !== item.name) {
                        const customerUpdateResult = await projectsCollection.updateMany(
                            { customer_name: oldCustomer },
                            { $set: { customer_name: item.name } },
                            { session }
                        );
                    }
                    // 4. If the customer name has changed, update related contracts
                    if (oldCustomer !== item.name) {
                        const customerUpdateResultContract = await contractsCollection.updateMany(
                            { customer_name: oldCustomer },
                            { $set: { customer_name: item.name } },
                            { session }
                        );
                    }

                    res.send(result);
                });

            } catch (error) {
                console.error("Error updating customer and projects:", error);
                res.status(500).send({ error: "Failed to update customer and related projects." });
            } finally {
                await session.endSession();
            }
        });


        // Insert a department with duplicate handling
        app.post("/departments", async (req, res) => {
            const departments = req.body;
            try {
                // Attempt to insert the new department
                const result = await departmentsCollection.insertOne(departments);
                res.send(result);
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Department already exists." });
                } else {
                    console.error("Error inserting department:", error);
                    res.status(500).send({ error: "Failed to add department." });
                }
            }
        });


        // Get 1st 10 departments with pagination
        app.get("/departments", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await departmentsCollection.countDocuments();
                const departments = await departmentsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    departments,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch departments" });
            }
        });

        // get all departments
        app.get("/departments/all", async (req, res) => {
            try {
                // Fetch all departments
                const departments = await departmentsCollection.find().toArray();
                res.send(departments);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all departments" });
            }
        });

        // Update a department and related employees
        app.patch('/departments/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            // Start a session for transaction
            const session = client.startSession();

            try {
                // Start transaction
                await session.withTransaction(async () => {
                    // 1. Find the existing department
                    const existingDepartment = await departmentsCollection.findOne(filter, { session });
                    if (!existingDepartment) {
                        res.status(404).send({ error: 'Department not found' });
                        return;
                    }

                    const oldDepartmentName = existingDepartment.department_name;

                    // 2. Update the department
                    const updatedDepartment = {
                        $set: {
                            department_name: item.department_name,
                            department_status: item.department_status
                        }
                    };

                    const result = await departmentsCollection.updateOne(filter, updatedDepartment, { session });

                    // 3. If the department name has changed, update related employees
                    if (oldDepartmentName !== item.department_name) {
                        const employeeUpdateResult = await employeesCollection.updateMany(
                            { department_name: oldDepartmentName },
                            { $set: { department_name: item.department_name } },
                            { session }
                        );
                    }

                    res.send(result);
                });

            } catch (error) {
                console.error("Error updating department and employees:", error);
                res.status(500).send({ error: "Failed to update department and related employees." });
            } finally {
                await session.endSession();
            }
        });


        // Insert a designation with duplicate handling
        app.post("/designations", async (req, res) => {
            const designations = req.body;
            try {
                // Attempt to insert the new designations
                const result = await designationsCollection.insertOne(designations);
                res.send(result);
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Designation already exists." });
                } else {
                    console.error("Error inserting designation:", error);
                    res.status(500).send({ error: "Failed to add designation." });
                }
            }
        });

        // Get 1st 10 designations with pagination
        app.get("/designations", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await designationsCollection.countDocuments();
                const designations = await designationsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    designations,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch designations" });
            }
        });

        // get all designations
        app.get("/designations/all", async (req, res) => {
            try {
                // Fetch all designations
                const designations = await designationsCollection.find().toArray();
                res.send(designations);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all designations" });
            }
        });


        // Update a designations and related employees
        app.patch('/designations/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            // Start a session for transaction
            const session = client.startSession();

            try {
                // Start transaction
                await session.withTransaction(async () => {
                    // 1. Find the existing designations
                    const existingDesignation = await designationsCollection.findOne(filter, { session });
                    if (!existingDesignation) {
                        res.status(404).send({ error: 'Designation not found' });
                        return;
                    }

                    const oldDesignation = existingDesignation.designation;

                    // 2. Update the designation
                    const updatedDesignation = {
                        $set: {
                            designation: item.designation,
                            designation_status: item.designation_status
                        }
                    };

                    const result = await designationsCollection.updateOne(filter, updatedDesignation, { session });

                    // 3. If the designation name has changed, update related employees
                    if (oldDesignation !== item.designation) {
                        const employeeUpdateResult = await employeesCollection.updateMany(
                            { designation: oldDesignation },
                            { $set: { designation: item.designation } },
                            { session }
                        );
                    }

                    res.send(result);
                });

            } catch (error) {
                console.error("Error updating designation and employees:", error);
                res.status(500).send({ error: "Failed to update designation and related employees." });
            } finally {
                await session.endSession();
            }
        });


        // insert a project with duplicate error handling
        app.post("/projects_master", async (req, res) => {
            const projects_master = req.body;
            try {
                const result = await projects_MasterCollection.insertOne(projects_master);
                res.send(result);
            }
            catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "This Project already exists." });
                } else {
                    console.error("Error inserting project:", error);
                    res.status(500).send({ error: "Failed to add project." });
                }
            }
        });

        // Get 1st 10 customers with pagination
        app.get("/projects_master", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                // Default to 10 items per page
                const skip = (page - 1) * limit;

                const total = await projects_MasterCollection.countDocuments();
                const projects_master = await projects_MasterCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    projects_master,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch projects" });
            }
        });


        // Update a project and related project collection
        app.patch('/projects_master/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            // Start a session for transaction
            const session = client.startSession();

            try {
                // Start transaction
                await session.withTransaction(async () => {
                    // 1. Find the existing project
                    const existingProject = await projects_MasterCollection.findOne(filter, { session });
                    if (!existingProject) {
                        res.status(404).send({ error: 'Project not found' });
                        return;
                    }

                    const oldProjectName = existingProject.project_name;

                    // 2. Update the project
                    const updatedProject = {
                        $set: {
                            project_name: item.project_name,
                            project_code: item.project_code,
                            project_status: item.project_status
                        }
                    };

                    const result = await projects_MasterCollection.updateOne(filter, updatedProject, { session });

                    // 3. If the project name has changed, update related project
                    if (oldProjectName !== item.project_name) {
                        const projectUpdateResult = await projectsCollection.updateMany(
                            { project_name: oldProjectName },
                            { $set: { project_name: item.project_name } },
                            { session }
                        );
                    }

                    res.send(result);
                });

            } catch (error) {
                console.error("Error updating projects:", error);
                res.status(500).send({ error: "Failed to update projects_master and related projects." });
            } finally {
                await session.endSession();
            }
        });

        // get all projects(projects_master)
        app.get("/projects_master/all", async (req, res) => {
            try {
                // Fetch all projects(projects_master)
                const projects = await projects_MasterCollection.find().toArray();
                res.send(projects);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all projects" });
            }
        });

        // insert a employee with duplicate error handling
        app.post("/employees", async (req, res) => {
            const employees = req.body;
            try {
                const result = await employeesCollection.insertOne(employees);
                res.send(result);
            }
            catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "This Employee already exists." });
                } else {
                    console.error("Error inserting employee:", error);
                    res.status(500).send({ error: "Failed to add employee." });
                }
            }
        });

        // import employees functionality
        app.post('/employees/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const employees = req.body;

                // Ensure employees is an array
                if (!Array.isArray(employees) || employees.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of employees' });
                }

                const result = await employeesCollection.insertMany(employees, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import employees' });
            }
        });

        // Get 1st 10 employees with pagination
        app.get("/employees", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await employeesCollection.countDocuments();
                const employees = await employeesCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    employees,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch employees" });
            }
        });

        // New API for exporting all employees without pagination
        app.get("/employees/all", async (req, res) => {
            try {
                // Fetch all employees
                const employees = await employeesCollection.find().toArray();
                res.send(employees);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all employees" });
            }
        });

        // update a employees
        app.patch('/employees/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedEmployee = {
                $set: {
                    employee_name: item.employee_name,
                    department_name: item.department_name,
                    designation: item.designation,
                    employee_phone: item.employee_phone,
                    employee_email: item.employee_email,
                    employee_uid: item.employee_uid,
                    employee_pass: item.employee_pass
                }
            }

            const result = await employeesCollection.updateOne(filter, updatedEmployee)
            res.send(result);
        });

        // Endpoint to post data and handle file and form data
        app.post('/contracts', upload.single('contract_file'), async (req, res) => {
            try {
                // Parse the closing_date from the request
                const closingDate = new Date(req.body.closing_date);
                const today = new Date();

                // Determine contract_status based on closing_date
                const contract_status = closingDate < today ? "0" : "1"; // "0" for Expired, "1" for Not Expired

                // Create the new contract object
                const newContract = {
                    contract_title: req.body.contract_title,
                    customer_name: req.body.customer_name,
                    project_type: req.body.project_type,
                    refNo: req.body.refNo,
                    first_party: req.body.first_party,
                    signing_date: req.body.signing_date,
                    effective_date: req.body.effective_date,
                    closing_date: req.body.closing_date,
                    scan_copy_status: req.body.scan_copy_status,
                    hard_copy_status: req.body.hard_copy_status,
                    contract_status: contract_status,
                    contract_file: req.file.filename, // Save the file name in the database
                };

                // Insert the new contract into the database
                const result = await contractsCollection.insertOne(newContract);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error saving contract:', error);
                res.status(500).send('Server error');
            }
        });

        // get the specific contract 
        app.get("/contracts/view/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await contractsCollection.findOne(query);
            res.send(result)
        })

        // Get 1st 10 contracts with pagination
        app.get("/contracts", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await contractsCollection.countDocuments();
                const contracts = await contractsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    contracts,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch contracts" });
            }
        });

        // import contracts functionality
        app.post('/contracts/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const contracts = req.body;

                // Ensure contracts is an array
                if (!Array.isArray(contracts) || contracts.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of contracts' });
                }

                const result = await contractsCollection.insertMany(contracts, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import contracts' });
            }
        });

        // New API for exporting all contracts without pagination
        app.get('/contracts/all', async (req, res) => {
            try {
                const contracts = await contractsCollection.find().toArray();
                const today = new Date();
                // Set time to 00:00:00 to compare only the date, ignoring time
                today.setHours(0, 0, 0, 0);

                const updatedContracts = contracts.map(contract => {
                    const closingDate = new Date(contract.closing_date);
                    closingDate.setHours(0, 0, 0, 0); // Ignore time part of the date

                    // Compare closing date with today
                    const contract_status = closingDate > today ? "1" : "0";// "0": Expired, "1": Not Expired
                    // console.log(contract_status);
                    return { ...contract, contract_status };
                });


                res.send(updatedContracts);
            } catch (error) {
                console.error('Error fetching contracts:', error);
                res.status(500).send('Server error');
            }
        });

        // update a contract
        app.patch('/contracts/:id', async (req, res) => {
            const item = req.body;
            // Parse the closing_date from the request
            const closingDate = new Date(item.closing_date);
            const today = new Date();

            // Determine contract_status based on closing_date
            const contract_status = closingDate < today ? "0" : "1";


            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedContract = {
                $set: {
                    contract_title: item.contract_title,
                    customer_name: item.customer_name,
                    project_type: item.project_type,
                    refNo: item.refNo,
                    first_party: item.first_party,
                    signing_date: item.signing_date,
                    effective_date: item.effective_date,
                    closing_date: item.closing_date,
                    contract_status: contract_status,
                    scan_copy_status: item.scan_copy_status,
                    hard_copy_status: item.hard_copy_status
                }
            }

            const result = await contractsCollection.updateOne(filter, updatedContract)
            res.send(result);
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Kaka is running");
})

app.listen(port, () => {
    console.log(`Kaka is sitting on port ${port}`);
})