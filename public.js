const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const session = require('express-session')
const mysql = require('mysql');
const flash= require('express-flash')
const cookieParser = require('cookie-parser')
const path = require('path')
const multer  = require('multer')
"use strict";
const nodemailer = require("nodemailer");
const { format } = require('path');

const storage= multer.diskStorage({
  destination:path.join(__dirname,'photos'),
  filename: function (pet, file, cb) {
    cb(null, Math.random()+file.originalname);
  }
})

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : 'Xeraton246810',
  database        : 'blog_viajes'
});
 


app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.set('view engine','ejs')
app.use(session({secret: 'token-muy-secreto',resave:true, suaveUninitialized:true}))
app.use(flash())
app.use(cookieParser())
app.use(multer({ storage:storage}).single('image'))
app.use(express.static('photos'))


  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'pruebanode123@gmail.com', // generated ethereal user
      pass: '123123*prueba', // generated ethereal password
    },
  });

 
function enviarCorreo(email, nombre) {
  const opciones={
    from: 'pruevanode123@gmail.com',
    to: email,
    subject: 'Bienvenido al blog de viajes',
    text: `Hola ${nombre}`
  }
  transporter.sendMail(opciones,(error,info)=> {

  });
}

app.get('/', function (pet, res) {
  pool.getConnection(function (err,connec) {  
  const query=`SELECT publicaciones.id, publicaciones.titulo, publicaciones.resumen, publicaciones.votos, publicaciones.foto, autores.seudonimo FROM publicaciones join autores where publicaciones.autor_id=autores.id order by votos LIMIT 3`
  connec.query(query, function (error, results, fields) {
    res.render('index',{publicaciones:results})
  })
  connec.release()
  })
    
  })

app.get('/singup',function (pet,res) { 
  res.render('singup',{mensaje:pet.flash('mensaje')})
 })


 app.get('/session',function (pet,res) { 
  res.render('inicio',{mensaje:pet.flash('mensaje')})
 })


 app.post('/singup-form', function (pet,res) { 
  pool.getConnection(function (err,connec) {
    const email = pet.body.email.toLowerCase().trim()
    const seudonimo = pet.body.seudonimo.trim()
    const contrasena = pet.body.contrasena
    console.log(email,seudonimo,contrasena)
    const consultaEmail = `SELECT * FROM autores WHERE email=${connec.escape(email)}`
    console.log(consultaEmail)
    connec.query(consultaEmail, function (err,filas, campos) {
    if (filas.length > 0){
      pet.flash('mensaje','Email duplicado')
      res.redirect('/singup')      
  
    }
    else if (email.length <= 0 || email=='') {
      pet.flash('mensaje','Ingresa email')
      res.redirect('/singup')      
      
    }
    else{
      const consultaSeudonimo = `SELECT * FROM autores WHERE seudonimo=${connec.escape(seudonimo)}`
      connec.query(consultaSeudonimo, function (err,filas, campos) {
        console.log(consultaSeudonimo)
        if (filas.length > 0){
        pet.flash('mensaje','Seudonimo duplicado')
        res.redirect('/singup')      
        }
        else if (seudonimo.length <= 0){
        pet.flash('mensaje','Ingresa un pseudonimo')
        res.redirect('/singup')
        }
        else {
          if (contrasena.length<=0) {
            pet.flash('mensaje','Ingresa una contraseña')
            res.redirect('/singup')
          }
          else{
            const consulta = `INSERT INTO autores VALUES (NULL,${connec.escape(seudonimo)}, NULL, ${connec.escape(email)},${connec.escape(contrasena)})`
            console.log(consulta)
            connec.query(consulta, function (err,filas, campos) {
            pet.flash('mensaje','Usuario registrado')
            enviarCorreo(email,seudonimo)
            res.redirect('/singup')
      })
          }
            } 
         })
        }     
      })
      connec.release()
    })
 })


app.post('/init', function (pet,res) { 
  pool.getConnection(function (err,connec) {
    const email1 = pet.body.email.toLowerCase().trim()
    const contrasena1 = pet.body.contrasena
    const consultaEmail = `SELECT * FROM autores WHERE 
    email=${connec.escape(email1)}`
     connec.query(consultaEmail, function (err,filas, campos) {
      const data=filas[0]
      console.log(data)
    if (data==undefined){
      pet.flash('mensaje','Email no registrado')
      res.redirect('/session')
        
    }
    else{
      if (data.email==email1 || data.contrasena == contrasena1){
        pet.session.Usuario=data.seudonimo
        pet.session.numb=data.id
        pet.session.avatar=data.avatar
        console.log(pet.session.Usuario,pet.session.numb)
        res.redirect('/activa')
      }
      else{
        pet.flash('mensaje','Contraseña invalida')
        res.redirect('/session')
      }
      
    }
            
      })
      connec.release() 
    })
 })


app.get('/activa',function (pet,res) {

  pool.getConnection(function (err,connec) {  
    const query=`SELECT * FROM autores join publicaciones WHERE autores.id=publicaciones.autor_id and autores.seudonimo='${pet.session.Usuario}'`
    let modificadorPagina=""
     let pagina=0
    connec.query(query, function (error, results, fields) {
      search=pet.query.search
      console.log(search)
    if (search=='' || search==undefined) {
      pagina = (pet.query.pagina)? parseInt(pet.query.pagina):0
      if (pagina<0){
        pagina =0
      }
      modificadorPagina= `LIMIT 5 OFFSET ${pagina*5}`
      var world=`SELECT * FROM autores join publicaciones where autores.id=publicaciones.autor_id ${modificadorPagina}`

    }
    else {
      var world=`SELECT * FROM autores join publicaciones where autores.id=publicaciones.autor_id and  titulo LIKE ${connec.escape('%'+search+'%')} or resumen like ${connec.escape('%'+search+'%')} or contenido like ${connec.escape('%'+search+'%')}`
      modificadorPagina=""
    }
    console.log(world)
    connec.query(world,function (error,rows,field) {

      res.render('home',{usuario:pet.session.Usuario, numb:pet.session.numb,post:results,all:rows,pagina:pagina, avatar:pet.session.avatar})
    } )  
      
    })
    connec.release()
    })
  


})


app.get('/photo', function (pet,res) {
  pool.getConnection(function (err,connec) {  
    const query=`SELECT * FROM autores join publicaciones WHERE autores.id=publicaciones.autor_id and publicaciones.id=${pet.query.id}`
     connec.query(query, function (error, results, fields) {
     console.log(results)
     if (results=='' || results== undefined){
       res.redirect('/activa',{usuario:pet.session.Usuario})
     }

      else{
            
            console.log(results)
            res.render('vista',{usuario:pet.session.Usuario,vistas:results, avatar:pet.session.avatar})
      } 
      
    })
    connec.release()
    })
  
 })



 app.get('/post',function(pet,res){
  res.render('post',{usuario:pet.session.Usuario, numb:pet.session.numb, avatar:pet.session.avatar})
})


app.post("/postito", (pet, res) => {
  if (!pet.file) {
      console.log("No file upload");
  } else {
            pool.getConnection(function (err,connec) {
      const imgsrc = "/" + pet.file.filename
      const insertData = `INSERT INTO publicaciones VALUES (NULL,${connec.escape(pet.body.titulo)},${connec.escape(pet.body.resumen)},
      ${connec.escape(pet.body.contenido)},NOW(),${connec.escape(pet.body.numb)},NULL,${connec.escape(imgsrc)})`
      console.log(insertData)
      connec.query(insertData, (err, result) => {
          if (err) throw err
          console.log("file uploaded")
          res.redirect('/activa')
      })
      connec.release()
    
    })
  }
});


app.get('/settings', function (pet,res) {
  res.render('avatar',{usuario:pet.session.Usuario, avatar:pet.session.avatar})
  
})

app.post("/avatar", (pet, res) => {
  if (!pet.file) {
      console.log("No file upload")
      res.redirect('/activa')
  } else {
      pool.getConnection(function (err,connec) {
      const imgsrc = "/" + pet.file.filename
      const insertData = `UPDATE autores SET avatar= ${connec.escape(imgsrc)} WHERE seudonimo=${connec.escape(pet.body.seudonimo)}`
      connec.query(insertData, (err, result) => {
          if (err) throw err
          console.log(insertData)
          console.log("file uploaded")
          res.redirect('/activa')
      })
      connec.release()
    
    })
  }
});



app.get('/like',function (pet,res) {
  pool.getConnection(function (err,connec) {
    const publicacion =  `SELECT * FROM publicaciones WHERE id=${pet.query.id}`
    console.log(publicacion)
    connec.query(publicacion, function(err, filas, campos){
    console.log(filas[0])
    if (filas[0].votos=='null'||filas[0].votos==''){
      var voto=1
    }
    else {
      var voto = 1 + Number(filas[0].votos)

    }
    const query = `UPDATE publicaciones  SET votos=${voto} WHERE id=${pet.query.id}`
    connec.query(query, function (err,result){
     console.log(query)
      console.log(voto)
      res.redirect('/activa')
    })

    })
    connec.release() 
    
  })
})


app.get('/edit', function(pet,res){
  pool.getConnection(function (err,connec) {
    const publicacion =  `SELECT * FROM publicaciones WHERE id=${connec.escape(pet.query.id)}`
    console.log(publicacion)
    connec.query(publicacion, function(err, filas, campos){
     res.render("actualizar",{usuario:pet.session.Usuario, numb:pet.query.id, items:filas[0], avatar:pet.session.avatar})
    })
    connec.release()

  })
  
})

app.post('/actualizar', function (pet,res) {
  pool.getConnection(function (err,connec) {
    const query = `UPDATE publicaciones SET titulo=${connec.escape(pet.body.titulo)}, resumen=${connec.escape(pet.body.resumen)},
    contenido=${connec.escape(pet.body.contenido)} WHERE id=${connec.escape(pet.body.numb)}`
    console.log(query)
    connec.query(query, function (err,result){
            res.redirect('/activa')
    })
    connec.release()
  })

})



app.get('/del', function(pet,res){
  pool.getConnection(function (err,connec) {
    const publicacion =  `DELETE FROM publicaciones WHERE id=${connec.escape(pet.query.id)}`
    console.log(publicacion)
    connec.query(publicacion, function(err, filas, campos){
     res.redirect('/activa')
    })
    connec.release()

  })
})


 app.get('/out', function(pet,res){
  pet.session.destroy()
  res.redirect("/")
})


app.get('/api/v1/publicaciones',(pet,res)=>{
//GET /api/v1/publicaciones	JSON con todas las publicaciones.
pool.getConnection(function (err,connec) {
  if (pet.query.busqueda==undefined ){
    var query = `SELECT * FROM publicaciones`
  }
  else {
    var query = `SELECT * FROM autores join publicaciones where autores.id=publicaciones.autor_id and  titulo LIKE ${connec.escape('%'+pet.query.busqueda+'%')} or resumen like ${connec.escape('%'+pet.query.busqueda+'%')} or contenido like ${connec.escape('%'+pet.query.busqueda+'%')}`
  }
  console.log(query)
  connec.query(query, function (err,filas,colum){
          res.json({data:filas})
  })
  connec.release()
})

})

app.get('/api/v1/publicaciones/:id',(pet,res)=>{
//GET /api/v1/publicaciones/<id>	Publicación con id = <id>. Considera cuando el id no existe.
pool.getConnection(function (err,connec) {
  const query = `SELECT * FROM publicaciones where id=${connec.escape(pet.params.id)}`
  console.log(query)
  connec.query(query, function (err,filas,colum){
    if (filas.length==''){
      res.json({data:'Aun no publican con ese id / o fue eliminada'})
    }      
    else {
      res.json({data:filas})

    }
  })
  connec.release()
})
})
app.get('/api/v1/autores',(pet,res)=>{
//GET /api/v1/autores	JSON con todos los autores.
pool.getConnection(function (err,connec) {
  const query = `SELECT * FROM autores `
  console.log(query)
  connec.query(query, function (err,filas,colum){
          res.json({data:filas})
  })
  connec.release()
})
})
app.get('/api/v1/autores/:id',(pet,res)=>{
//GET /api/v1/autores/<id>	JSON con la información del autor con id = <id> y este contiene sus publicaciones. Considera cuando el id no existe.
pool.getConnection(function (err,connec) {
  const query = `SELECT autores.seudonimo, publicaciones.titulo FROM autores JOIN  publicaciones on publicaciones.autor_id = autores.id where autores.id=${(pet.params.id)}`
  connec.query(query, function (err,filas,colum){
    if (filas.length==''){
      res.json({data:'Autor no existe, sin registro'})
    }      
    else {
      res.json({data:filas})

    }
  })
  connec.release()
})
})
app.post('/api/v1/autores',(pet,res)=>{
//POST /api/v1/autores	Crea un autor dado un pseudónimo, email, contraseña. Validar peticiones con pseudónimos duplicados o email duplicados. Devuelve un JSON con el objeto creado.
pool.getConnection(function (err,connec) {
  var email = 'demo'+ Math.round(Math.random()*13000000000)+'@email.com'
  var seudonimo = 'demo'+ Math.round(Math.random()*15000000000)
  const contrasena = 123123
  console.log(email,seudonimo,contrasena)
  const consultaEmail = `SELECT * FROM autores WHERE email=${connec.escape(email)}`
  console.log(consultaEmail)
  connec.query(consultaEmail, function (err,filas, campos) {
  console.log(filas)
  if (filas.length > 0){
    console.log('Email duplicado')
    pet.flash('mensaje','Email duplicado')
    res.json({data:'Email duplicado'})      

  }
  else{
    const consultaSeudonimo = `SELECT * FROM autores WHERE seudonimo=${connec.escape(seudonimo)}`
    connec.query(consultaSeudonimo, function (err,filas, campos) {
      console.log(consultaSeudonimo)
      if (filas.length > 0){
        pet.flash('mensaje','Seudonimo duplicado')
      res.json({data:'Seudonimo duplicado'})      
      }
      else {
        if (contrasena.length<=0) {
          pet.flash('mensaje','Ingresa una contraseña')
          res.json({data:'Ingrese una contraseña'})
        }
        else{
          const consulta = `INSERT INTO autores VALUES (NULL,${connec.escape(seudonimo)}, NULL, ${connec.escape(email)},${contrasena})`
          connec.query(consulta, function (err,filas, campos) {
          const creado=  `SELECT * FROM autores ORDER BY id DESC LIMIT 1`
          connec.query(creado,(err,filas,campos)=>{
            res.json({data:filas})
          }) 
          
    })
        }
          } 
       })
      }     
    })
    connec.release()
  })  
})
app.post('/api/v1/publicaciones',(pet,res)=>{
//POST /api/v1/publicaciones?email=<email>&contrasena=<contrasena>	Crea una publicación para el usuario con <email> = email,si este se puede validar correctamente con la contraseña. Se le envía un título, resumen y contenido. Devuelve un JSON con el objeto creado.
pool.getConnection(function (err,connec) {
  const consulta =`SELECT id from autores WHERE email=${connec.escape(pet.query.email)} and contrasena=${connec.escape(pet.query.contrasena)} `
  connec.query(consulta, (err, result) => {
  if (result==""||result==undefined) {  
    res.json({data:"Credenciales invalidas"})
   }  
  
  
  else 
  
  {  
  console.log(result[0].id)
  const insertData = `INSERT INTO publicaciones VALUES (NULL,${connec.escape('Bienvenido!')},${connec.escape('Primera publicacion')},
  ${connec.escape('Email y contraseña validas, es tu primera publicacion')},NOW(),${result[0].id},NULL,NULL)`
  console.log(insertData)
  connec.query(insertData, (err, result) => {
      const publicacion=`SELECT * FROM publicaciones ORDER BY id DESC LIMIT 1`
      connec.query(publicacion,(err,result)=>{
        res.json({data:result})
      })     
      
  })
  connec.release()
}
})

})  
})

app.delete('/api/v1/publicaciones/:id',(pet,res)=>{
//DELETE /api/v1/publicaciones/<id>?email=<email>&contrasena=<contrasena></contrasena>  
pool.getConnection(function (err,connec) {
  const consulta =`SELECT id from autores WHERE email=${connec.escape(pet.query.email)} and contrasena=${connec.escape(pet.query.contrasena)}`
  connec.query(consulta, (err, result) => {
  if (result==""||result==undefined) {  
    res.json({data:"Credenciales invalidas"})
   }  
  
  
  else 
   {
  const publicacion = `SELECT * from publicaciones WHERE autor_id=${result[0].id} and id=${pet.params.id}`
  connec.query(publicacion, (err,result)=>{
    if  (result==""||result==undefined) {  
      res.json({data:"Id de la publicacion no pertenece al autor"})
     } 
     else {
      const insertData = `DELETE FROM publicaciones WHERE id=${pet.params.id} and autor_id=${result[0].id}`
      console.log(insertData)
      connec.query(insertData, (err, result) => {
                  res.json({data:"Publicacion eliminada"})     
          
      })
    
     }
  })
  connec.release()}

})

})

})





app.listen(8080, function(){
    console.log("A pubicar!!")
})
