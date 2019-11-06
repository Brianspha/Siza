/**================================================== Environment variables initialisation ================================================== **/
require('dotenv').config({
    path: "../config/vars.env",
    encoding: "utf8"
})
/**================================================== API initialisation ================================================== **/
let http = require('http')
const accountSid = 'ACf3a72211fdb119bdd9ec5d84b0e31174';
const authToken = '546e281377a602f6b72a78f0c3a1b0f9';
const client = require('twilio')(accountSid, authToken);
let port = process.env.PORT
let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
        return
    }
    console.log('Connected to the in-memory SQlite database.');
});

db.serialize(function () {
    db.run("CREATE TABLE IF NOT EXISTS question (question_id INTEGER PRIMARY KEY AUTOINCREMENT,question TEXT,institution_name TEXT,phone_number INT,category TEXT,FOREIGN KEY(institution_name) REFERENCES institution(abrv))")
    db.run("CREATE TABLE IF NOT EXISTS response (response_id INTEGER PRIMARY KEY AUTOINCREMENT,question_id INTEGER,institution_name TEXT,phone_number INT, student_number TEXT,response TEXT,FOREIGN KEY(institution_name) REFERENCES institution(abrv),FOREIGN KEY(question_id) REFERENCES question(question_id))")
    db.run("CREATE TABLE IF NOT EXISTS cache (last_entered TEXT,phone_number INT PRIMARY KEY,selected_option INT,institution TEXT,FOREIGN KEY(phone_number) REFERENCES response(phone_number))");
    db.run("CREATE TABLE IF NOT EXISTS institution (abrv PRIMARY KEY,name TEXT)")
    db.run("INSERT INTO institution (abrv,name) VALUES('rhodes','Rhodes Unversity')")
    db.run("INSERT INTO institution (abrv,name) VALUES('uct','University of Cape Town')")
    db.run("INSERT INTO institution (abrv,name) VALUES('nmu','Nelson Mandela University')")
    db.run("INSERT INTO institution (abrv,name) VALUES('wits','Wits University')")
    db.run("INSERT INTO institution (abrv,name) VALUES('up','University of Pretoria')")
    db.run("INSERT INTO institution (abrv,name) VALUES('ukzn','University of Kwa-Zulu Natal')")
    saveQuestion('Ngisacela ukubuza umah ngingakaze ngisenze isifundo sokubalisisa ngabe akhona yini amkhozi engiganwathatha azongsiza ektheni ngikwazi ukuba ebangeni kwafundi absenza isifundo sokubalisa?', 'rhodes', '27840838902', 'courses')
    saveQuestion('how much does it cost to travel from umtata to makhanda?', 'rhodes', '27840838902', 'living')
    saveQuestion('Hello if i am on nsfas do i get a living stipend', 'rhodes', '27840838902', 'funding')
    saveQuestion('How many points do i need to qaulify for psychology and what courses should i take in highschool?', 'rhodes', '27840838902', 'courses')
    db.all("SELECT * FROM question WHERE institution_name='rhodes'", [], (err, rows) => {
        saveResponse(rows[0].question_id, rows[0].institution_name, rows[0].phone_number, 'g14m1112', 'Sawubona😃\n\n\n Yebo zikhona izifundo ongakwazi ukuzifundela ezizokusiza ekutheni ukwazi ukuba ebangeni labantu abasenza isfundo sokubalisa')
        return
    })
})

/**================================================== Functions Start  ================================================== **/
function saveResponse(question_id, institution_name, phone_number, student_number, response) {
    db.run(`INSERT INTO response (question_id,institution_name,phone_number,student_number,response)
        VALUES('${question_id}' , '${institution_name}' , '${phone_number}' , '${student_number}',
       '${response}')`)
}

function saveQuestion(question, institution_name, phone_number, category) {
    db.run(`INSERT INTO question (question,institution_name,phone_number,category) VALUES('${question}' , '${institution_name}' , '${phone_number}','${category}')`)
}

function sendMessage(to, message, callMain) {
    console.log("sending: " + to + " message: ", message)
    if (to == "+undefined") {
        return
    }
    client.messages
        .create({
            body: message,
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:' + to
        })
        .then((message) => {

        })
        .done();
}

function resetToMainmenuDB(from) {
    db.run("REPLACE INTO cache VALUES('none','" + from + "','-1','none')")
}

function saveSelectedOption(from, last_entered, option, institution) {
    if (institution === null) {
        institution = 'none'
    }
    console.log("saving user option: ", from, last_entered, option, institution)
    db.run("REPLACE INTO cache VALUES('" + last_entered + "'" + "," + "'" + from + "'" + "," + "'" + option + "'" + "," + "'" + institution + "'" + ")")
}

function getInnerOptions(from, option) {
    var responseMessage = ''
    switch (option) {
        case "institutions_details":
            responseMessage = 'Insitution Details 🎓'
            return
    }
}

function availableInstitutions(to) {
    var responseMessage = 'Available Institutions 🎓\n\n\n'
    db.all('Select * from institution', [], (err, rows) => {
        for (var i = 0; i < rows.length; i++) {
            responseMessage += `${i+1}. ${rows[i].name}\n`
        }
        responseMessage += "\n\n0 to go back 🔙🔙"
        saveSelectedOption(to, 'pick_institution', 1)
        sendMessage(to, responseMessage)
        subMenu = true
    })
}

function resetToMainmenu(from) {
    responseMessage = "Welcome 🙂 how can we help you \n1. Institutions";
    console.log('sending main menu: ', from)
    saveSelectedOption(from, "none", 1, "none")
    sendMessage(from, responseMessage, false)
}
/**================================================== API Start ================================================== **/

var server = http.createServer();
server.on('request', function (request, response) {
    response.writeHead(200);
    var data = '';
    var from = '';
    var responseMessage = "";
    request.on('data', function (chunk) {
        var subMenu = false
        data = chunk.toString().split('&')
        from = "+" + data[data.length - 2].split("=")[1].split("B")[1]
        console.log("user: ", from)
        db.all("SELECT * FROM cache", [], (err, rows) => {
            var messageRequest = data[4].split("=")[1].toLowerCase()
            console.log(rows, messageRequest, from)
            if (rows.length === 0 && messageRequest !== "menu") {
                responseMessage = "Oops thats an invalid command ⚠️ Please use the 'menu' command to view menu options"
                sendMessage(from, responseMessage)
            } else if (rows.length === 0 && messageRequest === "menu") {
                resetToMainmenu(from)
                return
            } else {
                rows.forEach(row => {

                    if ("+" + row.phone_number === from) {
                        console.log("request: ", messageRequest)
                        console.log("last_entered: ", row.last_entered)
                        switch (row.last_entered) {
                            case "post_question":
                                switch (messageRequest) {
                                    case "0":
                                        saveSelectedOption(from, "selected_institution", 0, row.institution)
                                        resetToMainmenu(from)
                                        subMenu = true
                                        break
                                    default:
                                        saveQuestion(messageRequest, row.institution, from, 'living')
                                        sendMessage(from, `Succesfully posted question once students at ${row.institution} respond you shall receive a message 😃😃 `)
                                        resetToMainmenu(from)
                                        break
                                }
                                break
                            case "answer_question":
                                switch (messageRequest) {
                                    case "0":
                                        saveSelectedOption(from, "selected_institution", 0, row.institution)
                                        resetToMainmenu(from)
                                        subMenu = true
                                        break
                                    default:
                                        var split = messageRequest.split(',')
                                        var student_number = split[0]
                                        var message = split[1]
                                        console.log('student_number: ', student_number, "\nmessage: ", message)
                                        saveResponse(row.option, row.institution, from, student_number, message)
                                        sendMessage(from, `Succesfully answered question once students at ${row.institution} respond you shall receive a message 😃😃 `)
                                        resetToMainmenu(from)
                                        break
                                }
                                break
                            case "pick_institution":
                                db.all("Select * from institution", [], (err, rows) => {
                                    if (isNaN(messageRequest) && rows.length >= parseInt(messageRequest)) {
                                        responseMessage = "Oops 🙆‍♂️ please select from the listed institution options ⚠️"
                                        sendMessage(from, responseMessage, true)
                                    } else {
                                        var index = parseInt(messageRequest) === 0 ? 0 : parseInt(messageRequest) - 1
                                        var institution = rows[index]
                                        console.log("selected institution: ", institution)
                                        saveSelectedOption(from, "selected_institution", parseInt(messageRequest), institution.abrv)
                                        responseMessage = `Available Help 🆘 for ${institution.name} \n\n\n`
                                        responseMessage += "1. View all QandA\n"
                                        responseMessage += "2. Ask a Question\n"
                                        responseMessage += "3. Answer a Question\n\n\n"
                                        responseMessage += "0 to go back 🔙🔙"
                                        saveSelectedOption(from, "available_help", -1, institution.abrv)
                                        sendMessage(from, responseMessage)
                                        return
                                    }
                                })
                                return
                            case "available_help":
                                console.log("in available help: ", messageRequest)
                                switch (messageRequest) {
                                    case "0":
                                        resetToMainmenu(from)
                                        break
                                    case "1": //all
                                        responseMessage = `Questions and Answers by ${row.institution} students for propectus students💡💡\n\n\n\n`
                                        db.all("Select * from question", [], (err, rows) => {
                                            rows.forEach((row) => {
                                                responseMessage += `💡 ${row.question}\n\n`
                                                db.all(`Select * from response where question_id= '${row.question_id}'`, [], (err, rows) => {
                                                    if (rows.length > 0) {
                                                        rows.forEach((response) => {
                                                            responseMessage += `🙋 ${response.response}\n\n`
                                                        })
                                                    }
                                                })
                                            })
                                            responseMessage += "Press 0 🔙🔙 to go back"
                                            sendMessage(from, responseMessage)
                                            saveSelectedOption(from, "available_help", 1, row.institution)
                                        })
                                        break
                                    case "2":
                                        responseMessage = "Please enter your question ❓❓ in the following way\n\n\n"
                                        responseMessage += "example question \n\n *I would like to ask about the application process at rhodes*\n\n Press 0 🔙🔙 to cancel"
                                        saveSelectedOption(from, "post_question", 2, row.institution)
                                        sendMessage(from, responseMessage)
                                        break
                                    case "3": //Answer
                                        responseMessage = `Please pick the question ❓❓ you would like to answer *N.B.Please ensure you are a student/alumni at${row.institution} before you answer*\n\n\n`
                                        db.all("Select * from question", [], (err, rows) => {
                                            var count = 1
                                            rows.forEach((row) => {
                                                responseMessage += `${count} ${row.question}\n\n`
                                                count++
                                            })
                                            responseMessage += "0 to go back 🔙🔙"
                                            saveSelectedOption(from, "pick_question", 1, row.institution)
                                            sendMessage(from, responseMessage)
                                        })
                                        break
                                }
                                break
                            default:
                                rows.forEach((row) => {
                                    if ("+" + row.phone_number === from) {
                                        switch (messageRequest.toLowerCase()) {
                                            case "0":
                                                switch (row.last_entered) {
                                                    case "available_institution":
                                                        resetToMainmenu(from)
                                                        entered = false
                                                        break
                                                }
                                                break
                                            case "1":
                                                console.log("row ", row)
                                                if (row.last_entered === "none" && row.institution === 'none') {
                                                    console.log("in opt 1")
                                                    availableInstitutions(from)
                                                    entered = false
                                                }
                                                break
                                            default:
                                                responseMessage = "Oops Oops 🙆‍♂️ thats an invalid command ⚠️"
                                                sendMessage(from, responseMessage, true)
                                                break
                                        }
                                    }
                                })
                                break
                        }
                    }
                })
            }
        })
    })
})
console.log('Listening on port: ', port)
server.listen(port)