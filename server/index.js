const commentsRouter = require('./routes/comments');
const categoriesRouter = require('./routes/categories');

app.use('/api/comments', commentsRouter);
app.use('/api/categories', categoriesRouter); 