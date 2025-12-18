
import * as fs from 'fs/promises';
import * as path from 'path';

const sourceDir = 'effects';
const destDir = path.join('src', 'standalone', 'effects');

async function moveFiles() {
  try {
    await fs.mkdir(destDir, { recursive: true });
    console.log(`Created destination directory: ${destDir}`);

    const items = await fs.readdir(sourceDir, { withFileTypes: true });
    console.log(`Found ${items.length} items in ${sourceDir}`);

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item.name);
      const destPath = path.join(destDir, item.name);

      if (item.isDirectory()) {
        console.log(`Processing directory: ${item.name}`);
        await fs.mkdir(destPath, { recursive: true });
        const subItems = await fs.readdir(sourcePath, { withFileTypes: true });
        for (const subItem of subItems) {
            const subSourcePath = path.join(sourcePath, subItem.name);
            const subDestPath = path.join(destPath, subItem.name);
            if(subItem.isDirectory()){
                await fs.mkdir(subDestPath, { recursive: true });
                const subSubItems = await fs.readdir(subSourcePath, { withFileTypes: true });
                for (const subSubItem of subSubItems) {
                    const subSubSourcePath = path.join(subSourcePath, subSubItem.name);
                    const subSubDestPath = path.join(subDestPath, subSubItem.name);
                    console.log(`Copying file: ${subSubSourcePath} to ${subSubDestPath}`);
                    const content = await fs.readFile(subSubSourcePath);
                    await fs.writeFile(subSubDestPath, content);
                }
            } else {
                console.log(`Copying file: ${subSourcePath} to ${subDestPath}`);
                const content = await fs.readFile(subSourcePath);
                await fs.writeFile(subDestPath, content);
            }
        }
      } else {
        console.log(`Copying file: ${item.name}`);
        const content = await fs.readFile(sourcePath);
        await fs.writeFile(destPath, content);
      }
    }

    console.log('All files and directories moved successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

moveFiles();
