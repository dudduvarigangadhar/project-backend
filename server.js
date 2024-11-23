const express = require("express")
const {open} = require("sqlite")
const path = require("path")
const sqlite3 = require("sqlite3")
const cors = require("cors")
const { get } = require("http")
// const {v4: uuid} = require('uuid')
let db;
const app = express()
app.use(cors())
app.use(express.json())

const initializeDBandServer = async () => {
    try{
        db = await open({
            filename: path.join(__dirname,"notes.db"),
            driver: sqlite3.Database,
        });
        app.listen(9000, ()=> {
            console.log("Server is running on http://localhost:9000")
        });

        db.run(
            `
            CREATE TABLE IF NOT EXISTS notes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT DEFAULT 'Others',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
    
        );

        db.run(
            `CREATE TRIGGER IF NOT EXISTS update_notes
            AFTER UPDATE ON notes 
            FOR EACH ROW 
            BEGIN
                UPDATE notes
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = OLD.id;
            END;
            `
        );
        
        
        
    }catch(error){
        console.log(`Database error is ${error.message}`);
        process.exit(1);
    }
};

initializeDBandServer() ;

// app.get("/",(request,response)=>{
//     response.send("hello word! vinayakaya namaha");
// })

app.post("/notes/",async(request,response) => {
    const {title,description,category} = request.body 
    const addQuery = `
    INSERT INTO notes(title,description,category)
    VALUES (?,?,?);`

    try{
        await db.run(addQuery,[title,description,category || "Others"])
        response.send("created todo");
    }catch(e){
        response.send("error in creating note")
    }
})

app.delete("/notes/:id/", async (request,response)=>{
    const {id} = request.params
    const deleteQuery = `DELETE FROM notes WHERE id = ?`
    try{
        await db.run(deleteQuery,[id])
        response.send("deleted note")
    }catch(e){
        response.send("error in deleting todo");
    }
})

app.put("/notes/:id/",async (request,response)=> {
    const {id} = request.params
    const {title,description,category} = request.body 
    const updateQuery = `UPDATE notes SET title = ?, description = ? , category = ? WHERE id = ?`
    try{
        await db.run(updateQuery, [title,description,category,id])
        response.send("updated notes")
    }catch(e){
        console.log(e.message);
        response.send("error in updating todo")
    }
})

app.get("/notes/",async (req,res) => {
    const getQuery = `SELECT * FROM notes`;
    try{
        const notesArr = await db.all(getQuery)
        res.send(notesArr)
    }catch(e){
        res.send("Error in fetching notes")
    }
})

app.get("/notes/search/",async (request,response) => {
    const {q} = request.query
    
    if(!q){
        return res.status(400).json({error: "Query parameter 'q' is required"});
    }

    const getQuery = `
    SELECT * FROM notes 
    WHERE title LIKE ? OR category LIKE ?
    `

    const params = [`%${q}%`, `%${q}%`];

    try{
        const searchArr = await db.all(getQuery,params)
        response.send(searchArr)
    }catch(e){
        response.send("error in getting the searched data")
    }
})