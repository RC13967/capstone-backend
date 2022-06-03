import express, { response } from "express";
import { MongoClient } from "mongodb";
import mongo from 'mongodb';
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
import cors from "cors";
import { compare } from "bcrypt";
import { router1 } from "./admin.js";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import Grid from 'gridfs-stream';
import assert from 'assert';
import fs from 'fs';
import { ObjectId } from "mongodb";
export const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
const MONGO_URL = 'mongodb://localhost';
const PORT = process.env.PORT;
// const MONGO_URL = process.env.MONGO_URL;
const storage = new GridFsStorage({
  url: 'mongodb://localhost:27017/capstone',
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: "uploads",
      filename: `${Date.now()}-file-${file.originalname}`,
    };
  },
});
const upload = multer({ storage });
const storageProfile = new GridFsStorage({
  url: 'mongodb://localhost:27017/capstone',
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, profileFile) => {
    return {
      bucketName: "profileUploads",
      filename: `${Date.now()}-file-${profileFile.originalname}`,
    };
  },
});
const uploadProfile = multer({ storage: storageProfile });
export async function createConnection() {
  const client = new MongoClient(MONGO_URL)
  await client.connect();
  return client;
};
app.get("/", (request, response) => {
  response.send("This is home page, append appropriate end points");
})
app.get("/posts", async (request, response) => {
  const { email } = request.body;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  if (user.length > 0) {
    response.send(user[0].posts);
  } else {
    response.send([]);
  }
});
app.post("/globalPosts", async (request, response) => {
  const { email } = request.body;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  if (user.length > 0) {
    const users = await client.db("capstone").collection("users").find({}).toArray();
    let posts = [];
    for (let i = 0; i < users.length; i++) {
      if (users[i].posts) {

        for (let j = 0; j < users[i].posts.length; j++) {
          var file = await client.db("capstone").collection('uploads.files')
            .find({ "_id": users[i].posts[j].postId }).toArray();
          var fileType = "";
          if (file.length > 0) {
            var chunks = await client.db("capstone").collection('uploads.chunks')
              .find({ "files_id": users[i].posts[j].postId }).sort({ n: 1 }).toArray();
            let fileData = [];
            for (let k = 0; k < chunks.length; k++) {
              fileData.push(chunks[k].data.toString('base64'));
            }
            let finalFile = 'data:' + file[0].contentType + ';base64,' + fileData.join('');
            fileType = file[0].contentType;
            file = finalFile;
          }
          var userPicFile = await client.db("capstone").collection('profileUploads.files')
            .find({ "_id": users[i].picture }).toArray();
          let finalPicFile = "";
          if (userPicFile.length > 0) {
            let userPicChunks = await client.db("capstone").collection('profileUploads.chunks')
              .find({ "files_id": users[i].picture }).toArray();
            let pictureFileData = [];
            for (let l = 0; l < userPicChunks.length; l++) {
              pictureFileData.push(userPicChunks[l].data.toString('base64'));
            }
            finalPicFile = 'data:' + userPicFile[0].contentType + ';base64,' + pictureFileData.join('');
          }
          var liked = false;
          var disliked = false;
          if (users[i].posts[j].liked.filter((el) => el.toString() === user[0]._id.toString()).length > 0) {
            liked = true
          } else if (users[i].posts[j].disliked.filter((el) => el.toString() === user[0]._id.toString()).length > 0) {
            disliked = true
          }
          posts.push({
            fileType: fileType,
            file: file,
            postId: users[i].posts[j].postId,
            postText: users[i].posts[j].postText,
            likes: users[i].posts[j].likes,
            dislikes: users[i].posts[j].dislikes,
            comments: users[i].posts[j].comments,
            commentDetails: users[i].posts[j].commentDetails,
            uploadDate: users[i].posts[j].uploadDate,
            liked: liked,
            disliked: disliked,
            likedList: users[i].posts[j].liked,
            dislikedList: users[i].posts[j].disliked,
            postedUserName: users[i].firstName + users[i].lastName,
            postedUserPic: finalPicFile,
            postedUserId:users[i]._id
          })
        }
      }
    }

    response.send(posts);
  }
  // var db = client.db('capstone');
  // var gfs = Grid(db, mongo);

  // const file =  gfs.files.findOne({ _id:user[0].posts[0].id });
  //       const readStream = gfs.createReadStream(user[0].posts[0].postId);
  //       readStream.pipe(response);

});
app.post("/myPosts", async (request, response) => {
  const { email } = request.body;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  if (user.length > 0 && user[0].posts) {
    let posts = [];
    for (let i = 0; i < user[0].posts.length; i++) {
      var file = await client.db("capstone").collection('uploads.files')
        .find({ "_id": user[0].posts[i].postId }).toArray();
      var fileType = "";
      if (file.length > 0) {
        var chunks = await client.db("capstone").collection('uploads.chunks')
          .find({ "files_id": user[0].posts[i].postId }).sort({ n: 1 }).toArray();
        let fileData = [];
        for (let j = 0; j < chunks.length; j++) {
          fileData.push(chunks[j].data.toString('base64'));
        }
        let finalFile = 'data:' + file[0].contentType + ';base64,' + fileData.join('');
        fileType = file[0].contentType;
        file = finalFile;
      }
      var userPicFile = await client.db("capstone").collection('profileUploads.files')
        .find({ "_id": user[0].picture }).toArray();
      let finalPicFile = "";
      if (userPicFile.length > 0) {
        let userPicChunks = await client.db("capstone").collection('profileUploads.chunks')
          .find({ "files_id": user[0].picture }).toArray();
        let pictureFileData = [];
        for (let l = 0; l < userPicChunks.length; l++) {
          pictureFileData.push(userPicChunks[l].data.toString('base64'));
        }
        finalPicFile = 'data:' + userPicFile[0].contentType + ';base64,' + pictureFileData.join('');
      }
      var liked = false;
      var disliked = false;
      if (user[0].posts[i].liked.filter((el) => el.toString() === user[0]._id.toString()).length > 0) {
        liked = true
      } else if (user[0].posts[i].disliked.filter((el) => el.toString() === user[0]._id.toString()).length > 0) {
        disliked = true
      }
      posts.push({
        uploadDate: user[0].posts[i].uploadDate,
        fileType: fileType,
        file: file,
        postId: user[0].posts[i].postId,
        postText: user[0].posts[i].postText,
        likes: user[0].posts[i].likes,
        dislikes: user[0].posts[i].dislikes,
        comments: user[0].posts[i].comments,
        commentDetails: user[0].posts[i].commentDetails,
        liked: liked,
        disliked: disliked,
        likedList: user[0].posts[i].liked,
        dislikedList: user[0].posts[i].disliked,
        postedUserName: user[0].firstName + user[0].lastName,
        postedUserPic: finalPicFile,
        postedUserId:user[0]._id
      })
    };

    response.send(posts);
  } else {
    response.send({});
  }
  // var db = client.db('capstone');
  // var gfs = Grid(db, mongo);

  // const file =  gfs.files.findOne({ _id:user[0].posts[0].id });
  //       const readStream = gfs.createReadStream(user[0].posts[0].postId);
  //       readStream.pipe(response);

});
app.put("/addPost", upload.single("file"), async (request, response) => {
  const { email, postText } = request.body;
  const { file } = request
  const client = await createConnection();
  let result;
  result = await client.db("capstone").collection("users").updateOne({
    email: email
  },
    {
      $push: {
        "posts": {
          postId: file ? file.id : ObjectId(),
          uploadDate: new Date().toLocaleString(),
          postText: postText,
          likes: 0,
          dislikes: 0,
          comments: 0,
          liked: [],
          disliked: [],
          commented: [],
          commentDetails: [],
        }
      }
    });

});
app.put("/deletePost", async (request, response) => {
  const { email, post } = request.body;
  const client = await createConnection();
  let result = await client.db("capstone").collection("users").updateOne({
    email: email
  },
    {
      $pull: {
        "posts": {
          postId: ObjectId(post.postId),
        }
      }
    });
  response.send(result);

});
app.put("/addProfile", uploadProfile.single("profileFile"), async (request, response) => {
  const { email } = request.body;
  const { file } = request;
  const client = await createConnection();
  let user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  if (user[0].picture) {
    await client.db("capstone").collection("profileUploads.files").deleteOne({ "_id": ObjectId(user[0].picture) });
    await client.db("capstone").collection("profileUploads.chunks").deleteMany({ "files_id": ObjectId(user[0].picture) });
  }
  const result = await client.db("capstone").collection("users").updateOne({
    email: email
  },
    {
      $set: {
        "picture": file.id
      }
    });

  var profileFile = await client.db("capstone").collection('profileUploads.files')
    .find({ "_id": file.id }).toArray();
  var chunks = await client.db("capstone").collection('profileUploads.chunks')
    .find({ "files_id": file.id }).sort({ n: 1 }).toArray();
  let profileData = [];
  for (let j = 0; j < chunks.length; j++) {
    profileData.push(chunks[j].data.toString('base64'));
  }
  let finalFile = 'data:' + profileFile[0].contentType + ';base64,' + profileData.join('');
  response.send({ finalFile: finalFile });
});
app.put("/likes", async (request, response) => {
  const { email, post } = request.body;
  let likes = post.likes;
  let dislikes = post.dislikes;
  let liked = post.liked;
  let disliked = post.disliked;
  let likedList = post.likedList;
  let dislikedList = post.dislikedList;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userId = user[0]._id;
  if (liked == true) {
    liked = false
    likedList = likedList.filter((el) => el.toString() != userId.toString());
    likes -= 1
  } else if (disliked == true) {
    liked = true
    likedList.push(ObjectId(userId));
    likes += 1;
    disliked = false
    dislikedList = dislikedList.filter((el) => el.toString() != userId.toString());
    dislikes -= 1;
  } else {
    liked = true;
    likedList.push(ObjectId(userId));
    likes += 1;
  }
  const result = await client.db("capstone").collection("users").updateOne({
    posts: { $elemMatch: { postId: ObjectId(post.postId) } }
  },
    {
      $set: {
        "posts.$.likes": likes,
        "posts.$.dislikes": dislikes,
        "posts.$.liked": likedList,
        "posts.$.disliked": dislikedList,
      }
    });
  response.send(result);
});
app.put("/dislikes", async (request, response) => {
  const { email, post } = request.body;
  let likes = post.likes;
  let dislikes = post.dislikes;
  let liked = post.liked;
  let disliked = post.disliked;
  let likedList = post.likedList;
  let dislikedList = post.dislikedList;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userId = user[0]._id;
  if (post.disliked === true) {
    disliked = false;
    dislikedList = dislikedList.filter((el) => el.toString() != userId.toString());
    dislikes -= 1;
  } else if (post.liked === true) {
    liked = false;
    likedList = likedList.filter((el) => el.toString() != userId.toString());
    likes -= 1;
    disliked = true;
    dislikedList.push(userId);
    dislikes += 1;
  } else {
    disliked = true
    dislikedList.push(userId);
    dislikes += 1;
  }
  const result = await client.db("capstone").collection("users").updateOne({
    posts: { $elemMatch: { postId: ObjectId(post.postId) } }
  },
    {
      $set: {
        "posts.$.likes": likes,
        "posts.$.dislikes": dislikes,
        "posts.$.liked": likedList,
        "posts.$.disliked": dislikedList,
      }
    });
  response.send(result);

});
app.put("/comments", async (request, response) => {
  const { email, post, comment } = request.body;
  let comments = post.comments;
  let oldCommentDetails = post.commentDetails;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userPicId = user[0].picture;
  let firstName = user[0].firstName;
  let lastName = user[0].lastName;
  const userPicFile = await client.db("capstone").collection("profileUploads.files").find({ "_id": userPicId }).toArray();
  let finalPicFile = "";
  if (userPicFile.length > 0) {
    const userPicChunks = await client.db("capstone").collection('profileUploads.chunks')
      .find({ "files_id": userPicId }).toArray();
    let pictureFileData = [];
    for (let i = 0; i < userPicChunks.length; i++) {
      pictureFileData.push(userPicChunks[i].data.toString('base64'));
    }
    finalPicFile = 'data:' + userPicFile[0].contentType + ';base64,' + pictureFileData.join('');
  }
  oldCommentDetails.push({
    firstName: firstName, lastName: lastName, picture: finalPicFile, userId: user[0]._id,
    commentId: ObjectId(), commentedDate: new Date().toLocaleString(), comment: comment,
    likes: 0, dislikes: 0, likedList: [], dislikedList: [], replies: 0, replyDetails: []
  });

  const result = await client.db("capstone").collection("users").updateOne({
    posts: { $elemMatch: { postId: ObjectId(post.postId) } }
  },
    {
      $set: {
        "posts.$.comments": comments + 1,
        "posts.$.commentDetails": oldCommentDetails,
      }
    });
  response.send(result);
});
app.put("/commentLikes", async (request, response) => {
  const { commentDetails, postId, email } = request.body;
  let likes = commentDetails.likes;
  let dislikes = commentDetails.dislikes;
  let liked = false;
  let disliked = false;
  let likedList = commentDetails.likedList;
  let dislikedList = commentDetails.dislikedList;
  let commentId = commentDetails.commentId;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userId = user[0]._id;
  if (likedList.filter((el) => el.toString() == userId.toString()).length > 0) {
    liked = false
    likedList = likedList.filter((el) => el.toString() != userId.toString());
    likes -= 1
  } else if (dislikedList.filter((el) => el.toString() == userId.toString()).length > 0) {
    liked = true
    likedList.push(ObjectId(userId));
    likes += 1;
    disliked = false
    dislikedList = dislikedList.filter((el) => el.toString() != userId.toString());
    dislikes -= 1;
  } else {
    liked = true;
    likedList.push(ObjectId(userId));
    likes += 1;
  }
  const result = await client.db("capstone").collection("users").updateOne({
    "posts.commentDetails": { $elemMatch: { commentId: { $in: [ObjectId(commentId), commentId] } } }
  },
    {
      $set: {
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].likes": likes,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].dislikes": dislikes,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].likedList": likedList,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].dislikedList": dislikedList,
      }
    },
    {
      "arrayFilters": [
        { "updatePost.postId": { $in: [ObjectId(postId), postId] } },
        { "updatecommentDetails.commentId": { $in: [ObjectId(commentId), commentId] } }
      ]
    });
  response.send(result);
});
app.put("/commentDislikes", async (request, response) => {
  const { commentDetails, postId, email } = request.body;
  let likes = commentDetails.likes;
  let dislikes = commentDetails.dislikes;
  let liked = false;
  let disliked = false;
  let likedList = commentDetails.likedList;
  let dislikedList = commentDetails.dislikedList;
  let commentId = commentDetails.commentId;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userId = user[0]._id;
  if (dislikedList.filter((el) => el.toString() == userId.toString()).length > 0) {
    disliked = false;
    dislikedList = dislikedList.filter((el) => el.toString() != userId.toString());
    dislikes -= 1;
  } else if (likedList.filter((el) => el.toString() == userId.toString()).length > 0) {
    liked = false;
    likedList = likedList.filter((el) => el.toString() != userId.toString());
    likes -= 1;
    disliked = true;
    dislikedList.push(userId);
    dislikes += 1;
  } else {
    disliked = true
    dislikedList.push(userId);
    dislikes += 1;
  }
  const result = await client.db("capstone").collection("users").updateOne({
    "posts.commentDetails": { $elemMatch: { commentId: { $in: [ObjectId(commentId), commentId] } } }
  },
    {
      $set: {
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].likes": likes,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].dislikes": dislikes,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].likedList": likedList,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].dislikedList": dislikedList,
      }
    },
    {
      "arrayFilters": [
        { "updatePost.postId": { $in: [ObjectId(postId), postId] } },
        { "updatecommentDetails.commentId": { $in: [ObjectId(commentId), commentId] } }
      ]
    });
  response.send(result);

});
app.put("/replies", async (request, response) => {
  const { email, postId, commentDetails, reply } = request.body;
  let replies = commentDetails.replies;
  let oldReplyDetails = commentDetails.replyDetails;
  let commentId = commentDetails.commentId;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  let userPicId = user[0].picture;
  let firstName = user[0].firstName;
  let lastName = user[0].lastName;
  const userPicFile = await client.db("capstone").collection("profileUploads.files").find({ "_id": userPicId }).toArray();
  let finalPicFile = "";
  if (userPicFile.length > 0) {
    const userPicChunks = await client.db("capstone").collection('profileUploads.chunks')
      .find({ "files_id": userPicId }).toArray();
    let pictureFileData = [];
    for (let i = 0; i < userPicChunks.length; i++) {
      pictureFileData.push(userPicChunks[i].data.toString('base64'));
    }
    finalPicFile = 'data:' + userPicFile[0].contentType + ';base64,' + pictureFileData.join('');
  }
  oldReplyDetails.push({
    firstName: firstName, lastName: lastName, picture: finalPicFile, userId: user[0]._id, commentId: commentId,
    replyId: ObjectId(), replyDate: new Date().toLocaleString(), reply: reply,
    likes: 0, dislikes: 0, liked: [], disliked: [], replies: 0, replyDetails: []
  });

  const result = await client.db("capstone").collection("users").updateOne({
    "posts.commentDetails": { $elemMatch: { commentId: { $in: [ObjectId(commentId), commentId] } } }
  },
    {
      $set: {
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].replies": replies + 1,
        "posts.$[updatePost].commentDetails.$[updatecommentDetails].replyDetails": oldReplyDetails,
      }
    },
    {
      "arrayFilters": [
        { "updatePost.postId": { $in: [ObjectId(postId), postId] } },
        { "updatecommentDetails.commentId": { $in: [ObjectId(commentId), commentId] } }
      ]
    });
  response.send(result);
});
app.put("/deletePost", async (request, response) => {
  const { email, post } = request.body;
  const client = await createConnection();
  const result = await client.db("capstone").collection("users")
    .updateOne({
      email: email
    },
      {
        $pull: {
          "posts": {
            postId: post.postId
          }
        }
      });
  response.send(result);
});
app.put("/deleteComment", async (request, response) => {
  const { email, commentDetails, post } = request.body;
  let commentId = commentDetails.commentId;
  let postId = post.postId;
  const client = await createConnection();
  const result = await client.db("capstone").collection("users")
    .updateOne({
      "posts.postId": ObjectId(postId)
    },
      {
        $pull: {
          "posts.$.commentDetails": { "commentId": { $in: [ObjectId(commentId), commentId] } },
        }

      }
    );
    if(result.modifiedCount == 1){
      await client.db("capstone").collection("users")
    .updateOne({
      "posts.postId": ObjectId(postId)
    },
      {
        $set: {
          "posts.$.comments": post.comments - 1,
        }

      }
    );
    }
  response.send(result);
});
app.use("/", router1);
app.listen(PORT, () => console.log("The server is started"));