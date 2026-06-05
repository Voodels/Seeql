export interface Problem {
  id: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  description: string
  ddl: string
  dml: string
  solution: string
}

export const PROBLEMS: Problem[] = [
  {
    id: "1757",
    title: "Recyclable and Low Fat Products",
    difficulty: "Easy",
    description: "Find the ids of products that are both low fat and recyclable.",
    ddl: "CREATE TABLE Products (product_id INT PRIMARY KEY, low_fats CHAR(1), recyclable CHAR(1))",
    dml: "INSERT INTO Products VALUES\n  (0, 'Y', 'N'),\n  (1, 'Y', 'Y'),\n  (2, 'N', 'Y'),\n  (3, 'Y', 'Y'),\n  (4, 'N', 'N')",
    solution: "SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y'",
  },
  {
    id: "182",
    title: "Duplicate Emails",
    difficulty: "Easy",
    description: "Find all duplicate email addresses.",
    ddl: "CREATE TABLE Person (id INT PRIMARY KEY, email VARCHAR(100))",
    dml: "INSERT INTO Person VALUES\n  (1, 'a@b.com'),\n  (2, 'c@d.com'),\n  (3, 'a@b.com')",
    solution: "SELECT email FROM Person GROUP BY email HAVING COUNT(*) > 1",
  },
  {
    id: "595",
    title: "Big Countries",
    difficulty: "Easy",
    description: "Find countries that are big by area (>=3M km²) or population (>=25M).",
    ddl: "CREATE TABLE World (name VARCHAR(100) PRIMARY KEY, continent VARCHAR(50), area INT, population INT, gdp BIGINT)",
    dml: "INSERT INTO World VALUES\n  ('Afghanistan', 'Asia', 652230, 25500100, 20343000000),\n  ('Albania', 'Europe', 28748, 2831741, 12960000000),\n  ('Algeria', 'Africa', 2381741, 37100000, 188681000000),\n  ('Andorra', 'Europe', 468, 78115, 3712000000),\n  ('Angola', 'Africa', 1246700, 20609294, 100990000000),\n  ('Australia', 'Oceania', 7692024, 23545500, 1567000000000),\n  ('China', 'Asia', 9596961, 1377422166, 10986000000000),\n  ('India', 'Asia', 3287263, 1295210000, 2127500000000),\n  ('Russia', 'Europe', 17098242, 146599183, 1578000000000),\n  ('Monaco', 'Europe', 2, 38400, 6620000000)",
    solution: "SELECT name, population, area FROM World WHERE area >= 3000000 OR population >= 25000000",
  },
  {
    id: "197",
    title: "Rising Temperature",
    difficulty: "Easy",
    description: "Find ids of records where temperature was higher than the previous day.",
    ddl: "CREATE TABLE Weather (id INT PRIMARY KEY, recordDate DATE, temperature INT)",
    dml: "INSERT INTO Weather VALUES\n  (1, '2015-01-01', 10),\n  (2, '2015-01-02', 25),\n  (3, '2015-01-03', 20),\n  (4, '2015-01-04', 30)",
    solution: "SELECT w1.id FROM Weather w1 JOIN Weather w2 ON DATEDIFF('DAY', w1.recordDate, w2.recordDate) = 1 WHERE w1.temperature > w2.temperature",
  },
  {
    id: "620",
    title: "Not Boring Movies",
    difficulty: "Easy",
    description: "Find movies with odd-numbered IDs that are not boring, ordered by rating descending.",
    ddl: "CREATE TABLE cinema (id INT PRIMARY KEY, movie VARCHAR(100), description VARCHAR(100), rating DECIMAL(2,1))",
    dml: "INSERT INTO cinema VALUES\n  (1, 'Film A', 'War', 8.9),\n  (2, 'Film B', 'Boring', 7.5),\n  (3, 'Film C', 'Science Fiction', 8.5),\n  (4, 'Film D', 'Boring', 6.2),\n  (5, 'Film E', 'Thriller', 9.0),\n  (6, 'Film F', 'Comedy', 7.1),\n  (7, 'Film G', 'Drama', 8.2),\n  (8, 'Film H', 'Boring', 5.5)",
    solution: "SELECT * FROM cinema WHERE MOD(id, 2) = 1 AND description != 'Boring' ORDER BY rating DESC",
  },
  {
    id: "1148",
    title: "Article Views I",
    difficulty: "Easy",
    description: "Find all authors who viewed at least one of their own articles. Return unique ids sorted ascending.",
    ddl: "CREATE TABLE Views (article_id INT, author_id INT, viewer_id INT, view_date DATE)",
    dml: "INSERT INTO Views VALUES\n  (1, 3, 5, '2019-08-01'),\n  (1, 3, 6, '2019-08-02'),\n  (2, 7, 7, '2019-08-01'),\n  (2, 7, 6, '2019-08-02'),\n  (4, 7, 1, '2019-07-22'),\n  (3, 4, 4, '2019-07-21'),\n  (3, 4, 4, '2019-07-21')",
    solution: "SELECT DISTINCT author_id AS id FROM Views WHERE author_id = viewer_id ORDER BY id",
  },
  {
    id: "177",
    title: "Nth Highest Salary",
    difficulty: "Medium",
    description: "Find the Nth highest salary. If there are fewer than N distinct salaries, return null.",
    ddl: "CREATE TABLE Employee (id INT PRIMARY KEY, salary INT)",
    dml: "INSERT INTO Employee VALUES\n  (1, 100),\n  (2, 200),\n  (3, 300),\n  (4, 200),\n  (5, 400),\n  (6, 150)",
    solution: "WITH Ranked AS (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM Employee) SELECT DISTINCT salary FROM Ranked WHERE r = 2",
  },
  {
    id: "184",
    title: "Department Highest Salary",
    difficulty: "Medium",
    description: "Find employees who have the highest salary in each department.",
    ddl: "CREATE TABLE Department (id INT PRIMARY KEY, name VARCHAR(100));\nCREATE TABLE Employee (id INT PRIMARY KEY, name VARCHAR(100), salary INT, departmentId INT)",
    dml: "INSERT INTO Department VALUES\n  (1, 'IT'),\n  (2, 'Sales');\nINSERT INTO Employee VALUES\n  (1, 'Joe', 70000, 1),\n  (2, 'Jim', 90000, 1),\n  (3, 'Henry', 80000, 2),\n  (4, 'Sam', 60000, 2),\n  (5, 'Max', 90000, 1)",
    solution: "WITH DeptMax AS (SELECT d.name AS Department, e.name AS Employee, e.salary, DENSE_RANK() OVER (PARTITION BY e.departmentId ORDER BY e.salary DESC) AS r FROM Employee e JOIN Department d ON e.departmentId = d.id) SELECT Department, Employee, Salary FROM DeptMax WHERE r = 1",
  },
  {
    id: "626",
    title: "Exchange Seats",
    difficulty: "Medium",
    description: "Swap the seat id of every two consecutive students. If the number of students is odd, the last id stays the same.",
    ddl: "CREATE TABLE Seat (id INT PRIMARY KEY, student VARCHAR(50))",
    dml: "INSERT INTO Seat VALUES\n  (1, 'Abbot'),\n  (2, 'Doris'),\n  (3, 'Emerson'),\n  (4, 'Green'),\n  (5, 'Jeames')",
    solution: "SELECT s1.id, COALESCE(s2.student, s1.student) AS student FROM Seat s1 LEFT JOIN Seat s2 ON (CASE WHEN s1.id % 2 = 1 THEN s1.id + 1 ELSE s1.id - 1 END) = s2.id ORDER BY s1.id",
  },
  {
    id: "175",
    title: "Combine Two Tables",
    difficulty: "Easy",
    description: "Report first name, last name, city, and state of each person. If address missing, show null.",
    ddl: "CREATE TABLE Person (personId INT PRIMARY KEY, firstName VARCHAR(50), lastName VARCHAR(50));\nCREATE TABLE Address (addressId INT PRIMARY KEY, personId INT, city VARCHAR(50), state VARCHAR(50))",
    dml: "INSERT INTO Person VALUES\n  (1, 'John', 'Doe'),\n  (2, 'Jane', 'Smith'),\n  (3, 'Bob', 'Johnson');\nINSERT INTO Address VALUES\n  (1, 2, 'New York', 'NY'),\n  (2, 3, 'Los Angeles', 'CA')",
    solution: "SELECT p.firstName, p.lastName, a.city, a.state FROM Person p LEFT JOIN Address a ON p.personId = a.personId",
  },
  {
    id: "180",
    title: "Consecutive Numbers",
    difficulty: "Medium",
    description: "Find all numbers that appear at least three times consecutively.",
    ddl: "CREATE TABLE Logs (id INT PRIMARY KEY, num INT)",
    dml: "INSERT INTO Logs VALUES\n  (1, 1),\n  (2, 1),\n  (3, 1),\n  (4, 2),\n  (5, 1),\n  (6, 2),\n  (7, 2)",
    solution: "WITH NumberedLogs AS (\n  SELECT id, num,\n    ROW_NUMBER() OVER (PARTITION BY num ORDER BY id) AS num_counter\n  FROM Logs\n),\nStreaks AS (\n  SELECT num, (id - num_counter) AS streak_id\n  FROM NumberedLogs\n)\nSELECT DISTINCT num AS ConsecutiveNums\nFROM Streaks\nGROUP BY num, streak_id\nHAVING COUNT(*) >= 3",
  },
  {
    id: "601",
    title: "Human Traffic of Stadium",
    difficulty: "Hard",
    description: "Find stadium visits where at least 3 consecutive rows have people >= 100, ordered by visit_date.",
    ddl: "CREATE TABLE Stadium (id INT PRIMARY KEY, visit_date DATE, people INT)",
    dml: "INSERT INTO Stadium VALUES\n  (1, '2017-01-01', 10),\n  (2, '2017-01-02', 109),\n  (3, '2017-01-03', 150),\n  (4, '2017-01-04', 99),\n  (5, '2017-01-05', 145),\n  (6, '2017-01-06', 1455),\n  (7, '2017-01-07', 199),\n  (8, '2017-01-08', 188)",
    solution: "WITH busy AS (\n  SELECT *, id - ROW_NUMBER() OVER (ORDER BY id) AS grp\n  FROM Stadium\n  WHERE people >= 100\n),\ngroups AS (\n  SELECT grp\n  FROM busy\n  GROUP BY grp\n  HAVING COUNT(*) >= 3\n)\nSELECT s.id, s.visit_date, s.people\nFROM Stadium s\nJOIN busy b ON s.id = b.id\nJOIN groups g ON b.grp = g.grp\nORDER BY s.visit_date",
  },
]
